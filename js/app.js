function territoryApp() {
    return {
        view: 'dashboard',
        isDark: false,
        territories: [],
        activeTerritory: null,
        selectionMode: false,
        selectedUnits: [],
        modals: { newTerritory: false, newAddress: false, note: false, deleteConfirm: false, colorPickerId: null, tutorial: false },
        deleteState: { type: null, id: null, targetName: '' },
        forms: { territoryName: '', territoryColor: null, addressName: '', addressUnits: '', addressRows: '', addressCols: '', addressCreationMode: 'simple', customCols: [], noteText: '' },
        currentEditingUnit: null,
        touchTimer: null,
        longPressTriggered: false,
        touchStartX: 0,
        touchStartY: 0,
        touchStartUnitX: 0,
        touchStartUnitY: 0,
        isUpdatingAddresses: false,
        searchQuery: '',
        filterType: 'all',
        tutorialStep: 0,

        initApp() {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDark = true;
            }
            // Apply dark class to html element
            document.documentElement.classList.toggle('dark', this.isDark);

            const stored = localStorage.getItem('territories');
            if (stored) this.territories = JSON.parse(stored);
            this.$watch('territories', (val) => localStorage.setItem('territories', JSON.stringify(val)));
            this.$watch('isDark', (val) => {
                localStorage.theme = val ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', val);
            });
            this.$watch('view', (val) => {
                // Helper for infinite scroll or similar
            });

            // Trigger tutorial on first visit
            if (!localStorage.getItem('tutorialSeen')) {
                setTimeout(() => {
                    this.startTutorial();
                }, 400);
            }
        },

        startTutorial() {
            this.tutorialStep = 0;
            this.modals.tutorial = true;
        },
        nextTutorialStep() {
            if (this.tutorialStep < 3) {
                this.tutorialStep++;
            } else {
                this.finishTutorial();
            }
        },
        prevTutorialStep() {
            if (this.tutorialStep > 0) {
                this.tutorialStep--;
            }
        },
        finishTutorial() {
            localStorage.setItem('tutorialSeen', 'true');
            this.modals.tutorial = false;
        },

        handleSwipeStart(e) {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            this.touchStartX = e.changedTouches[0].clientX;
            this.touchStartY = e.changedTouches[0].clientY;
        },
        handleSwipeEnd(e) {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            const diffX = e.changedTouches[0].clientX - this.touchStartX;
            const diffY = e.changedTouches[0].clientY - this.touchStartY;
            if (diffX > 100 && Math.abs(diffY) < 50 && Math.abs(diffX) > Math.abs(diffY) * 2 && (this.view === 'editor' || this.view === 'info')) {
                this.goBack();
            }
        },

        toggleTheme() { this.isDark = !this.isDark; },
        getDateString() { return new Date().toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' }); },
        formatDate(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        formatDateShort(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        formatDateTime(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        },

        openNewTerritoryModal() {
            this.forms.territoryName = '';
            this.forms.territoryColor = null;
            this.modals.newTerritory = true;
        },
        focusAtEnd(el) {
            if (!el) return;
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        },

        colorPalette: ['#a1305b', '#7858a4', '#6081b6', '#50a8b0', '#1f8d52', '#61c18d', '#b4c757', '#be7352', '#ac5655', '#895613'],

        toggleCardMenu(id) {
            this.modals.colorPickerId = this.modals.colorPickerId === id ? null : id;
        },
        closeCardMenu() {
            this.modals.colorPickerId = null;
        },
        setTerritoryColor(t, color) {
            t.color = color;
            this.modals.colorPickerId = null; // Close picker
        },

        submitNewTerritory() {
            if (!this.forms.territoryName) return;
            const newT = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.territoryName,
                color: this.forms.territoryColor,
                expiration: '',
                notes: '',
                addresses: []
            };
            this.territories.push(newT);
            this.filterType = 'all';
            this.modals.newTerritory = false;
        },
        openTerritory(id) {
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
        },
        goBack() {
            this.activeTerritory = null;
            this.view = 'dashboard';
            this.selectionMode = false;
        },
        openInfo() {
            this.view = 'info';
        },

        confirmDelete(type, id) {
            this.deleteState.type = type; this.deleteState.id = id;
            if (type === 'territory') this.deleteState.targetName = 'questo territorio';
            else if (type === 'address') this.deleteState.targetName = 'questo indirizzo';
            else if (type === 'units') this.deleteState.targetName = `${this.selectedUnits.length} citofoni selezionati`;
            this.modals.deleteConfirm = true;
        },
        executeDelete() {
            const { type, id } = this.deleteState;
            if (type === 'territory') this.territories = this.territories.filter(t => t.id !== id);
            else if (type === 'address') this.activeTerritory.addresses = this.activeTerritory.addresses.filter(a => a.id !== id);
            else if (type === 'units') {
                this.activeTerritory.addresses.forEach(a => {
                    if (a.columnsLayout) {
                        let currentStart = 0;
                        const newLayout = [...a.columnsLayout];
                        a.columnsLayout.forEach((count, colIdx) => {
                            const colUnits = a.units.slice(currentStart, currentStart + count);
                            const removedInThisCol = colUnits.filter(u => this.selectedUnits.includes(u.id)).length;
                            newLayout[colIdx] -= removedInThisCol;
                            currentStart += count;
                        });
                        a.columnsLayout = newLayout;
                    }
                    a.units = a.units.filter(u => !this.selectedUnits.includes(u.id));
                });
                this.selectedUnits = []; this.selectionMode = false;
            }
            this.modals.deleteConfirm = false;
        },
        openNewAddressModal() {
            this.forms.addressName = '';
            this.forms.addressUnits = '';
            this.forms.addressRows = '';
            this.forms.addressCols = '';
            this.forms.addressCreationMode = 'simple';
            this.forms.customCols = [];
            this.modals.newAddress = true;
        },
        submitNewAddress() {
            if (!this.forms.addressName) return;

            let count = 0;
            let cols = null;
            let columnsLayout = null;

            if (this.forms.addressCreationMode === 'simple') {
                count = parseInt(this.forms.addressUnits) || 0;
            } else if (this.forms.addressCreationMode === 'grid') {
                const r = parseInt(this.forms.addressRows) || 0;
                const c = parseInt(this.forms.addressCols) || 0;
                count = r * c;
                cols = c;
            } else if (this.forms.addressCreationMode === 'custom') {
                columnsLayout = this.forms.customCols.map(val => parseInt(val) || 0);
                count = columnsLayout.reduce((acc, val) => acc + val, 0);
                cols = columnsLayout.length;
            }

            const units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            this.activeTerritory.addresses.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.addressName,
                units: units,
                cols: cols,
                columnsLayout: columnsLayout
            });
            this.modals.newAddress = false;
        },
        getUnitsForColumn(addr, colIndex) {
            if (!addr.columnsLayout) return [];
            let start = 0;
            for (let i = 0; i < colIndex; i++) {
                start += addr.columnsLayout[i];
            }
            const count = addr.columnsLayout[colIndex];
            return addr.units.slice(start, start + count).map((u, i) => ({ ...u, globalIndex: start + i }));
        },
        createUnitObject() { return { id: Date.now() + Math.random().toString(), status: 0, note: '' }; },
        addUnit(addressId) {
            const addr = this.activeTerritory.addresses.find(a => a.id === addressId);
            if (addr) {
                addr.units.push(this.createUnitObject());
                if (addr.columnsLayout && addr.columnsLayout.length > 0) {
                    addr.columnsLayout[addr.columnsLayout.length - 1]++;
                }
            }
        },
        toggleSelectionMode() { this.selectionMode = !this.selectionMode; this.selectedUnits = []; },

        isSelected(unitId) { return this.selectedUnits.includes(unitId); },

        handleUnitClick(unit, addr) {
            if (this.longPressTriggered) { this.longPressTriggered = false; return; }
            if (this.selectionMode) {
                if (this.isSelected(unit.id)) this.selectedUnits = this.selectedUnits.filter(id => id !== unit.id);
                else this.selectedUnits.push(unit.id);
            } else {
                if (unit.status === 0) unit.status = 1; else if (unit.status === 1) unit.status = 2; else unit.status = 0;
                if (addr) addr.lastInteraction = new Date().toISOString();
            }
        },
        getUnitClasses(unit) {
            if (unit.isHole) {
                let holeBase = 'bg-slate-100/40 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200/80 dark:border-slate-800/80';
                if (this.selectionMode && this.isSelected(unit.id)) {
                    return 'scale-95 ring-4 ring-jw-600 ring-inset opacity-100 ' + holeBase;
                }
                return holeBase;
            }
            let base = '';
            switch (unit.status) {
                case 1: base = 'bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400 dark:border-emerald-600'; break;
                case 2: base = 'bg-rose-50/90 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-700'; break;
                default: base = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
            }
            if (this.selectionMode && this.isSelected(unit.id)) {
                return 'scale-95 ring-4 ring-jw-600 ring-inset opacity-100 ' + base;
            }
            if (this.selectionMode) return 'opacity-60 ' + base;
            return base;
        },
        bulkAction(action) {
            if (this.selectedUnits.length === 0) return;
            if (action === 'hole') {
                this.activeTerritory.addresses.forEach(a => {
                    a.units.forEach(u => {
                        if (this.selectedUnits.includes(u.id)) u.isHole = !u.isHole;
                    });
                });
            } else {
                const targetStatus = action === 'green' ? 1 : (action === 'red' ? 2 : 0);
                this.activeTerritory.addresses.forEach(a => {
                    a.units.forEach(u => {
                        if (this.selectedUnits.includes(u.id)) {
                            u.isHole = false;
                            u.status = targetStatus;
                        }
                    });
                });
            }
            this.selectedUnits = []; this.selectionMode = false;
        },
        handleTouchStart(unit, addr, e) {
            if (this.selectionMode || unit.isHole) return;
            this.longPressTriggered = false;
            clearTimeout(this.touchTimer);
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            if (touch) {
                this.touchStartUnitX = touch.clientX;
                this.touchStartUnitY = touch.clientY;
            }
            this.touchTimer = setTimeout(() => {
                this.longPressTriggered = true;
                if (navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (err) { }
                }
                this.openNoteModal(unit, addr);
            }, 600);
        },
        handleTouchMove(e) {
            if (!this.touchTimer) return;
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            if (touch) {
                const dx = touch.clientX - this.touchStartUnitX;
                const dy = touch.clientY - this.touchStartUnitY;
                if (Math.hypot(dx, dy) > 8) {
                    clearTimeout(this.touchTimer);
                    this.touchTimer = null;
                }
            }
        },
        handleTouchEnd(e) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        },
        handleNoteLongPress(unit, addr, e) {
            if (this.selectionMode || unit.isHole) return;
            this.longPressTriggered = true;
            this.openNoteModal(unit, addr);
        },
        openNoteModal(unit, addr) {
            this.currentEditingUnit = { unit, addr };
            this.forms.noteText = unit.note || '';
            this.modals.note = true;
        },
        cardTouchTimer: null,
        cardLongPressTriggered: false,
        cardTouchStartX: 0,
        cardTouchStartY: 0,

        handleCardTouchStart(t, e) {
            this.cardLongPressTriggered = false;
            clearTimeout(this.cardTouchTimer);
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
            if (touch) {
                this.cardTouchStartX = touch.clientX;
                this.cardTouchStartY = touch.clientY;
            }
            this.cardTouchTimer = setTimeout(() => {
                this.cardLongPressTriggered = true;
                if (navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (err) { }
                }
                this.confirmDelete('territory', t.id);
            }, 600);
        },
        handleCardTouchMove(e) {
            if (!this.cardTouchTimer) return;
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
            if (touch) {
                const dx = touch.clientX - this.cardTouchStartX;
                const dy = touch.clientY - this.cardTouchStartY;
                if (Math.hypot(dx, dy) > 8) {
                    clearTimeout(this.cardTouchTimer);
                    this.cardTouchTimer = null;
                }
            }
        },
        handleCardTouchEnd(e) {
            clearTimeout(this.cardTouchTimer);
            this.cardTouchTimer = null;
        },
        handleCardLongPress(t, e) {
            this.cardLongPressTriggered = true;
            this.confirmDelete('territory', t.id);
        },
        handleCardClick(t, e) {
            if (this.cardLongPressTriggered) {
                this.cardLongPressTriggered = false;
                return;
            }
            this.openTerritory(t.id);
        },

        closeNoteModal() { this.modals.note = false; this.currentEditingUnit = null; },
        saveNote() {
            if (this.currentEditingUnit) {
                this.currentEditingUnit.unit.note = this.forms.noteText;
                this.currentEditingUnit.addr.lastInteraction = new Date().toISOString();
            }
            this.closeNoteModal();
        },
        deleteCurrentEditingUnit() {
            if (this.currentEditingUnit && this.currentEditingUnit.addr && this.currentEditingUnit.unit) {
                const { addr, unit } = this.currentEditingUnit;
                if (addr.columnsLayout) {
                    let currentStart = 0;
                    const newLayout = [...addr.columnsLayout];
                    addr.columnsLayout.forEach((count, colIdx) => {
                        const colUnits = addr.units.slice(currentStart, currentStart + count);
                        if (colUnits.some(u => u.id === unit.id)) {
                            newLayout[colIdx] = Math.max(0, newLayout[colIdx] - 1);
                        }
                        currentStart += count;
                    });
                    addr.columnsLayout = newLayout;
                }
                addr.units = addr.units.filter(u => u.id !== unit.id);
            }
            this.closeNoteModal();
        },

        calculateGlobalStats() {
            let totalUnits = 0;
            let completedUnits = 0;

            this.territories.forEach(t => {
                if (t.addresses) {
                    t.addresses.forEach(a => {
                        if (a.units) {
                            const valid = a.units.filter(u => !u.isHole);
                            totalUnits += valid.length;
                            completedUnits += valid.filter(u => u.status !== 0).length;
                        }
                    });
                }
            });

            const remaining = totalUnits - completedUnits;
            const percent = totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

            return { percent, remaining, total: totalUnits };
        },

        calculateStats(t) {
            if (!t || !t.addresses || t.addresses.length === 0) return { percent: 0, green: 0, red: 0, neutral: 0, total: 0 };
            let total = 0, green = 0, red = 0;
            t.addresses.forEach(a => {
                if (a && a.units) {
                    const valid = a.units.filter(u => !u.isHole);
                    total += valid.length;
                    green += valid.filter(u => u.status === 1).length;
                    red += valid.filter(u => u.status === 2).length;
                }
            });
            const percent = total === 0 ? 0 : Math.round(((green + red) / total) * 100);
            return { percent, green, red, neutral: total - green - red, total };
        },
        calculateAddressStats(addr) {
            if (!addr || !addr.units || addr.units.length === 0) return { percent: 0, green: 0, red: 0, neutral: 0, total: 0 };
            const valid = addr.units.filter(u => !u.isHole);
            const total = valid.length;
            const green = valid.filter(u => u.status === 1).length;
            const red = valid.filter(u => u.status === 2).length;
            const percent = total === 0 ? 0 : Math.round(((green + red) / total) * 100);
            return { percent, green, red, neutral: total - green - red, total };
        },
        countTotalUnits(t) {
            if (!t || !t.addresses) return 0;
            return t.addresses.reduce((acc, a) => {
                if (!a || !a.units) return acc;
                return acc + a.units.filter(u => !u.isHole).length;
            }, 0);
        },
        getFilteredTerritories() {
            return this.territories.filter(t => {
                // Filter logic
                const matchesSearch = t.name.toLowerCase().includes(this.searchQuery.toLowerCase());
                if (!matchesSearch) return false;

                const stats = this.calculateStats(t);
                const isCompleted = stats.percent === 100 && stats.total > 0;
                const isInProgress = stats.percent > 0 && stats.percent < 100;

                let isExpired = false;
                if (t.expiration) {
                    const expDate = new Date(t.expiration);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    isExpired = expDate < today;
                }

                if (this.filterType === 'in_progress') return isInProgress;
                if (this.filterType === 'completed') return isCompleted;
                if (this.filterType === 'expired') return isExpired;

                return true;
            });
        }
    }
}

function territoryApp() {
    return {
        view: 'dashboard',
        isDark: false,
        territories: [],
        activeTerritory: null,
        selectionMode: false,
        selectedUnits: [],
        modals: { newTerritory: false, newAddress: false, note: false, deleteConfirm: false, colorPickerId: null, tutorial: false, tutorialComplete: false, pwaGuide: false, resetConfirm: false },
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
        introStep: 0,
        pwaStep: 0,
        tutorialActive: false,
        tutorialStep: 1,
        testedStates: { green: false, red: false, hole: false },

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

            // Trigger intro modal on first visit
            if (!localStorage.getItem('tutorialSeen')) {
                setTimeout(() => {
                    this.openIntroModal();
                }, 400);
            }
        },

        openIntroModal() {
            this.introStep = 0;
            this.modals.tutorial = true;
        },
        nextIntroStep() {
            if (this.introStep < 3) {
                this.introStep++;
            }
        },
        prevIntroStep() {
            if (this.introStep > 0) {
                this.introStep--;
            }
        },
        startInteractiveGuideFromIntro() {
            this.modals.tutorial = false;
            this.startInteractiveGuide();
        },
        openPwaGuide() {
            this.pwaStep = 0;
            this.modals.tutorial = false;
            this.modals.tutorialComplete = false;
            this.modals.pwaGuide = true;
        },
        closePwaGuide() {
            this.modals.pwaGuide = false;
        },
        nextPwaStep() {
            if (this.pwaStep < 3) {
                this.pwaStep++;
            }
        },
        prevPwaStep() {
            if (this.pwaStep > 0) {
                this.pwaStep--;
            }
        },
        startInteractiveGuide() {
            this.modals.tutorial = false;
            this.tutorialActive = true;
            this.tutorialStep = 1;
            this.testedStates = { green: false, red: false, hole: false };
            this.view = 'dashboard';
        },
        finishTutorial() {
            localStorage.setItem('tutorialSeen', 'true');
            this.modals.tutorial = false;
            this.modals.tutorialComplete = false;
            this.tutorialActive = false;
            this.tutorialStep = 0;
            this.view = 'dashboard';
            this.activeTerritory = null;
            this.selectionMode = false;
        },
        introTouchStartX: 0,
        handleIntroTouchStart(e) {
            if (e.touches && e.touches.length > 0) {
                this.introTouchStartX = e.touches[0].clientX;
            }
        },
        handleIntroTouchEnd(e) {
            if (e.changedTouches && e.changedTouches.length > 0) {
                const diffX = e.changedTouches[0].clientX - this.introTouchStartX;
                if (diffX < -40) {
                    this.nextIntroStep();
                } else if (diffX > 40) {
                    this.prevIntroStep();
                }
            }
        },

        cardTouchStartX: 0,
        cardTouchStartY: 0,
        cardIsDragging: false,
        handleCardTouchStart(e) {
            if (e.touches && e.touches.length > 0) {
                this.cardTouchStartX = e.touches[0].clientX;
                this.cardTouchStartY = e.touches[0].clientY;
                this.cardIsDragging = false;
            }
        },
        handleCardTouchMove(e) {
            if (e.touches && e.touches.length > 0) {
                const dx = e.touches[0].clientX - this.cardTouchStartX;
                const dy = e.touches[0].clientY - this.cardTouchStartY;
                if (Math.hypot(dx, dy) > 8) {
                    this.cardIsDragging = true;
                }
            }
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

        openTerritory(id) {
            if (this.cardIsDragging) {
                this.cardIsDragging = false;
                return;
            }
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
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
            if (this.tutorialActive && this.tutorialStep === 1) {
                this.tutorialStep = 2;
            }
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

        activeCardMenuId: null,
        toggleCardMenu(id) {
            this.activeCardMenuId = this.activeCardMenuId === id ? null : id;
        },
        closeCardMenu() {
            this.activeCardMenuId = null;
        },
        openColorModal(id) {
            this.activeCardMenuId = null;
            this.modals.colorPickerId = id;
        },
        setTerritoryColor(t, color) {
            if (t) t.color = color;
            this.modals.colorPickerId = null;
        },

        submitNewTerritory() {
            if (!this.forms.territoryName) return;
            const newT = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.territoryName,
                color: this.forms.territoryColor,
                notes: '',
                addresses: []
            };
            this.territories.push(newT);
            this.filterType = 'all';
            this.modals.newTerritory = false;
            if (this.tutorialActive) {
                this.openTerritory(newT.id);
                this.tutorialStep = 3;
            }
        },
        openTerritory(id) {
            if (this.cardIsDragging) {
                this.cardIsDragging = false;
                return;
            }
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
            if (this.tutorialActive && this.tutorialStep <= 2) {
                this.tutorialStep = 3;
            }
        },
        goBack() {
            this.activeTerritory = null;
            this.view = 'dashboard';
            this.selectionMode = false;
            this.activeCardMenuId = null;
        },
        previousView: 'dashboard',
        previousInfoView: 'settings',
        openSettings() {
            if (this.view !== 'settings' && this.view !== 'info') {
                this.previousView = this.view;
            }
            this.view = 'settings';
        },
        goBackFromSettings() {
            this.view = this.previousView || 'dashboard';
        },
        openInfo() {
            if (this.view !== 'info') {
                this.previousInfoView = this.view;
            }
            this.view = 'info';
        },
        goBackFromInfo() {
            this.view = this.previousInfoView || 'settings';
        },
        countAllAddresses() {
            if (!this.territories || this.territories.length === 0) return 0;
            return this.territories.reduce((sum, t) => sum + (t.addresses ? t.addresses.length : 0), 0);
        },
        countAllAppUnits() {
            if (!this.territories || this.territories.length === 0) return 0;
            return this.territories.reduce((sum, t) => sum + this.countTotalUnits(t), 0);
        },
        formatAppData() {
            localStorage.removeItem('territories');
            localStorage.removeItem('tutorialSeen');
            this.territories = [];
            this.activeTerritory = null;
            this.selectionMode = false;
            this.selectedUnits = [];
            this.modals.resetConfirm = false;
            this.view = 'dashboard';
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
            this.forms.addressRows = '4';
            this.forms.addressCols = '3';
            this.forms.addressCreationMode = 'simple';
            this.forms.visualRows = 4;
            this.forms.visualCols = 3;
            this.forms.visualSlots = [];
            this.updateVisualGridSlots();
            this.modals.newAddress = true;
        },
        updateVisualGridSlots() {
            const total = this.forms.visualRows * this.forms.visualCols;
            const newSlots = [];
            for (let i = 0; i < total; i++) {
                const existing = this.forms.visualSlots && this.forms.visualSlots[i];
                newSlots.push({ id: i, isHole: existing ? existing.isHole : false });
            }
            this.forms.visualSlots = newSlots;
        },
        addVisualRow() { this.forms.visualRows++; this.updateVisualGridSlots(); },
        removeVisualRow() { if (this.forms.visualRows > 1) { this.forms.visualRows--; this.updateVisualGridSlots(); } },
        addVisualCol() { this.forms.visualCols++; this.updateVisualGridSlots(); },
        removeVisualCol() { if (this.forms.visualCols > 1) { this.forms.visualCols--; this.updateVisualGridSlots(); } },
        toggleVisualSlot(idx) {
            if (this.forms.visualSlots[idx]) {
                this.forms.visualSlots[idx].isHole = !this.forms.visualSlots[idx].isHole;
            }
        },
        getVisualSlotUnitNumber(idx) {
            let activeCount = 0;
            for (let i = 0; i <= idx; i++) {
                if (this.forms.visualSlots[i] && !this.forms.visualSlots[i].isHole) {
                    activeCount++;
                }
            }
            return activeCount;
        },
        countActiveVisualUnits() {
            if (!this.forms.visualSlots) return 0;
            return this.forms.visualSlots.filter(s => !s.isHole).length;
        },
        submitNewAddress() {
            if (!this.forms.addressName) return;

            let units = [];
            let cols = null;

            if (this.forms.addressCreationMode === 'simple') {
                const count = parseInt(this.forms.addressUnits) || 0;
                units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            } else if (this.forms.addressCreationMode === 'grid') {
                const r = parseInt(this.forms.addressRows) || 0;
                const c = parseInt(this.forms.addressCols) || 0;
                const count = r * c;
                cols = c;
                units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            } else if (this.forms.addressCreationMode === 'custom') {
                cols = this.forms.visualCols;
                units = this.forms.visualSlots.map(s => ({
                    id: Date.now() + Math.random().toString(),
                    isHole: s.isHole,
                    status: 0,
                    note: ''
                }));
            }

            this.activeTerritory.addresses.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.addressName,
                units: units,
                cols: cols
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
                if (unit.isHole) {
                    // Tap on Hole -> Reset to Normal Non-Visitato (status 0)
                    unit.isHole = false;
                    unit.status = 0;
                } else if (unit.status === 0) {
                    // Click 1: Fatto (Green, 1)
                    unit.status = 1;
                } else if (unit.status === 1) {
                    // Click 2: Assente (Red, 2)
                    unit.status = 2;
                } else if (unit.status === 2) {
                    // Click 3: Spazio Vuoto (isHole: true)
                    unit.isHole = true;
                    unit.status = 0;
                }
                if (addr) addr.lastInteraction = new Date().toISOString();
                if (this.tutorialActive && this.tutorialStep === 3) {
                    if (unit.status === 1) this.testedStates.green = true;
                    if (unit.status === 2) this.testedStates.red = true;
                    if (unit.isHole) this.testedStates.hole = true;

                    if (this.testedStates.green && this.testedStates.red && this.testedStates.hole) {
                        setTimeout(() => {
                            if (this.tutorialActive && this.tutorialStep === 3) {
                                this.tutorialStep = 4;
                            }
                        }, 450);
                    }
                }
            }
        },
        getActiveUnitNumber(addr, unitId, fallbackIndex) {
            if (!addr || !addr.units) return fallbackIndex + 1;
            let activeCount = 0;
            for (let i = 0; i < addr.units.length; i++) {
                const u = addr.units[i];
                if (!u.isHole) {
                    activeCount++;
                }
                if (u.id === unitId) {
                    return activeCount;
                }
            }
            return fallbackIndex + 1;
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
        handleCardClick(t, e) {
            this.openTerritory(t.id);
        },

        closeNoteModal() { this.modals.note = false; this.currentEditingUnit = null; },
        saveNote() {
            if (this.currentEditingUnit) {
                this.currentEditingUnit.unit.note = this.forms.noteText;
                this.currentEditingUnit.addr.lastInteraction = new Date().toISOString();
            }
            this.closeNoteModal();
            if (this.tutorialActive && this.tutorialStep === 4) {
                this.tutorialActive = false;
                this.tutorialStep = 0;
                localStorage.setItem('tutorialSeen', 'true');
                setTimeout(() => {
                    this.modals.tutorialComplete = true;
                }, 300);
            }
        },
        promptRenameTerritory(t) {
            const newName = prompt("Modifica il nome del territorio:", t.name);
            if (newName && newName.trim()) {
                t.name = newName.trim();
            }
        },
        promptRenameAddress(addr) {
            const newName = prompt("Modifica nome indirizzo:", addr.name);
            if (newName && newName.trim()) {
                addr.name = newName.trim();
            }
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
                const matchesSearch = t.name.toLowerCase().includes(this.searchQuery.toLowerCase());
                if (!matchesSearch) return false;

                const stats = this.calculateStats(t);
                const isCompleted = stats.percent === 100 && stats.total > 0;
                const isInProgress = stats.percent > 0 && stats.percent < 100;

                if (this.filterType === 'in_progress') return isInProgress;
                if (this.filterType === 'completed') return isCompleted;

                return true;
            });
        }
    }
}

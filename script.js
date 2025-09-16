// Improved initialization for the main inventory script
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inventory script DOM loaded");
    initialize();
});

function initialize() {
    console.log("Inventory script initialize called");
    
    if (typeof OBR !== 'undefined' && OBR.isReady) {
        console.log("OBR ready immediately in inventory");
        main();
    } else if (typeof OBR !== 'undefined') {
        console.log("Waiting for OBR ready in inventory");
        OBR.onReady(() => {
            console.log("OBR ready callback fired in inventory");
            main();
        });
    } else {
        console.log("OBR not available, retrying...");
        setTimeout(initialize, 100);
    }
}

function main() {
    console.log("Inventory main function started");
    
    // Only run if we're in the inventory page (check for app container)
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        console.log("Not on inventory page, skipping main execution");
        return;
    }

    console.log("Running inventory initialization...");

    const EXTENSION_ID = "com.example.inventory";
    const METADATA_KEY = `${EXTENSION_ID}/data`;

    const BACKPACKS = {
        "Simple Pack": { weight: 21, slots: 3 },
        "Standard Pack": { weight: 25, slots: 3 },
        "Warrior's Pack": { weight: 26, slots: 6 },
        "Explorer's Pack": { weight: 30, slots: 4 },
        "Tinkerer's Pack": { weight: 21, slots: 10 },
        "Mule's Pack": { weight: 50, slots: 8 },
    };

    const ITEM_WEIGHTS = {
        large_weapon: 5,
        small_weapon: 3,
        armor: 8,
        clothing: 2,
        other: 1,
        arrows: 1, // Per stack of 5
    };
    
    const EQUIPMENT_SLOTS = [
        'head', 'face', 'neck', 'chest', 'arms', 'gloves', 'waist', 'legs', 'feet', 'primary_weapon', 'secondary_weapon'
    ];

    let localState = {
        players: {},
        currentUserId: null,
        viewedPlayerId: null,
        isGM: false,
    };

    // --- DATA MANAGEMENT ---
    async function loadData() {
        try {
            const metadata = await OBR.room.getMetadata();
            localState.players = metadata[METADATA_KEY] || {};
            console.log("Data loaded:", localState.players);
        } catch (error) {
            console.error("Error loading data:", error);
            localState.players = {};
        }
    }

    async function saveData() {
        try {
            await OBR.room.setMetadata({ [METADATA_KEY]: localState.players });
            console.log("Data saved successfully");
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }
    
    function getPlayerData(playerId) {
        if (!localState.players[playerId]) {
             localState.players[playerId] = {
                backpackType: "Simple Pack",
                inventory: [],
                equipment: {
                    head: null, face: null, neck: null, chest: null, arms: null, 
                    gloves: null, waist: null, legs: null, feet: null,
                    primary_weapon: null, secondary_weapon: null,
                    general: []
                },
                gold: { pieces: 0, pouches: 0, sacks: 0 },
                bankLocation: ""
            };
        }
        return localState.players[playerId];
    }

    // --- UI RENDERING ---
    function render() {
        try {
            const viewedPlayer = getPlayerData(localState.viewedPlayerId);
            const isReadOnly = localState.currentUserId !== localState.viewedPlayerId && !localState.isGM;

            renderPlayerSelector();
            renderBackpack(viewedPlayer, isReadOnly);
            renderEquipment(viewedPlayer, isReadOnly);
            renderInventory(viewedPlayer, isReadOnly);
            renderGold(viewedPlayer, isReadOnly);
            
            const addItemForm = document.getElementById('add-item-form');
            if (addItemForm) {
                addItemForm.style.display = isReadOnly ? 'none' : 'grid';
            }
            
            console.log("Render completed");
        } catch (error) {
            console.error("Error in render:", error);
        }
    }

    async function renderPlayerSelector() {
        try {
            const selector = document.getElementById('player-selector');
            if (!selector) return;
            
            const players = await OBR.party.getPlayers();
            
            const playerIdsInState = Object.keys(localState.players);
            const visiblePlayers = localState.isGM ? players : players.filter(p => playerIdsInState.includes(p.id));

            selector.innerHTML = visiblePlayers.map(player => 
                `<option value="${player.id}" ${player.id === localState.viewedPlayerId ? 'selected' : ''}>${player.name}</option>`
            ).join('');
        } catch (error) {
            console.error("Error rendering player selector:", error);
        }
    }

    function renderBackpack(playerData, isReadOnly) {
        try {
            const selector = document.getElementById('backpack-selector');
            if (selector) {
                selector.innerHTML = Object.keys(BACKPACKS).map(name => 
                    `<option value="${name}" ${name === playerData.backpackType ? 'selected' : ''}>${name}</option>`
                ).join('');
                selector.disabled = isReadOnly;
            }

            const maxWeight = BACKPACKS[playerData.backpackType].weight;
            const currentWeight = calculateWeight(playerData.inventory);

            const weightText = document.getElementById('weight-text');
            if (weightText) {
                weightText.textContent = `${currentWeight} / ${maxWeight}`;
            }

            const weightBar = document.getElementById('weight-bar');
            if (weightBar) {
                const percentage = Math.min((currentWeight / maxWeight) * 100, 100);
                weightBar.style.width = `${percentage}%`;
                
                weightBar.className = '';
                if (currentWeight > maxWeight) {
                    weightBar.classList.add('weight-bar-red');
                } else if (percentage > 75) {
                    weightBar.classList.add('weight-bar-red');
                } else if (percentage > 50) {
                    weightBar.classList.add('weight-bar-yellow');
                } else {
                    weightBar.classList.add('weight-bar-green');
                }
            }

            const banner = document.getElementById('overencumbered-banner');
            if (banner) {
                banner.style.display = currentWeight > maxWeight ? 'block' : 'none';
            }
        } catch (error) {
            console.error("Error rendering backpack:", error);
        }
    }

    function renderEquipment(playerData, isReadOnly) {
        try {
            const container = document.getElementById('equipment-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            EQUIPMENT_SLOTS.forEach(slotKey => {
                const item = playerData.equipment[slotKey];
                const displayName = slotKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                let itemHTML = `<span class="empty-slot">Empty</span>`;
                if(item) {
                   itemHTML = `<span class="equipment-slot-item" title="${item.desc || ''}">${item.name}</span>
                                <button class="unequip-btn" data-slot="${slotKey}" ${isReadOnly ? 'disabled' : ''}>✕</button>`;
                }
                container.innerHTML += `<div class="equipment-slot"><span class="equipment-slot-label">${displayName}:</span>${itemHTML}</div>`;
            });
            
            const generalSlotsCount = BACKPACKS[playerData.backpackType].slots;
            let generalSlotsHTML = `<div id="general-slots-container"><div class="equipment-slot-label" style="grid-column: 1 / -1;">General Slots (${generalSlotsCount})</div>`;

            if(!playerData.equipment.general) {
                playerData.equipment.general = Array(generalSlotsCount).fill(null);
            }
            while(playerData.equipment.general.length < generalSlotsCount) {
                 playerData.equipment.general.push(null);
            }
            playerData.equipment.general = playerData.equipment.general.slice(0, generalSlotsCount);

            playerData.equipment.general.forEach((item, index) => {
                 let itemHTML = `<span class="empty-slot">Empty</span>`;
                 if(item) {
                    itemHTML = `<span class="equipment-slot-item" title="${item.desc || ''}">${item.name}</span>
                                 <button class="unequip-btn" data-slot="general" data-index="${index}" ${isReadOnly ? 'disabled' : ''}>✕</button>`;
                 }
                 generalSlotsHTML += `<div class="equipment-slot">${itemHTML}</div>`;
            });
            generalSlotsHTML += `</div>`;
            container.innerHTML += generalSlotsHTML;
        } catch (error) {
            console.error("Error rendering equipment:", error);
        }
    }

    function renderInventory(playerData, isReadOnly) {
        try {
            const list = document.getElementById('inventory-list');
            if (!list) return;
            
            list.innerHTML = '';
            if (playerData.inventory.length === 0) {
                list.innerHTML = `<li class="inventory-item"><span class="item-info">Backpack is empty.</span></li>`;
                return;
            }

            playerData.inventory.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'inventory-item';
                
                let details = `Type: ${item.type.replace('_', ' ')}, Weight: ${ITEM_WEIGHTS[item.type]}`;
                if (item.type === 'arrows') {
                    details = `Arrows (x${item.quantity}), Weight: ${calculateArrowWeight(item.quantity)}`;
                }

                li.innerHTML = `<div class="item-info"><div class="item-name">${item.name}</div><div class="item-details">${details}</div>${item.features ? `<div class="item-features">${item.features}</div>` : ''}</div><div class="item-actions"><button class="equip-btn" data-index="${index}" ${isReadOnly ? 'disabled' : ''}>Equip</button><button class="delete-btn" data-index="${index}" ${isReadOnly ? 'disabled' : ''}>Del</button></div>`;
                list.appendChild(li);
            });
        } catch (error) {
            console.error("Error rendering inventory:", error);
        }
    }
    
    function renderGold(playerData, isReadOnly) {
        try {
            const pieces = document.getElementById('gold-pieces');
            const pouches = document.getElementById('gold-pouches');
            const sacks = document.getElementById('gold-sacks');
            
            if (pieces) pieces.textContent = playerData.gold.pieces;
            if (pouches) pouches.textContent = playerData.gold.pouches;
            if (sacks) sacks.textContent = playerData.gold.sacks;
            
            document.querySelectorAll('.gold-btn').forEach(btn => btn.disabled = isReadOnly);
        } catch (error) {
            console.error("Error rendering gold:", error);
        }
    }

    function calculateWeight(inventory) {
        return inventory.reduce((total, item) => {
            if (item.type === 'arrows') {
                return total + calculateArrowWeight(item.quantity);
            }
            return total + ITEM_WEIGHTS[item.type];
        }, 0);
    }
    
    function calculateArrowWeight(quantity) {
        return Math.ceil(quantity / 5);
    }
    
    function handleGoldConversion(playerData) {
        while (playerData.gold.pieces >= 10) { playerData.gold.pieces -= 10; playerData.gold.pouches += 1; }
        while (playerData.gold.pouches >= 10) { playerData.gold.pouches -= 10; playerData.gold.sacks += 1; }
        while (playerData.gold.pieces < 0 && playerData.gold.pouches > 0) { playerData.gold.pieces += 10; playerData.gold.pouches -= 1; }
        while (playerData.gold.pouches < 0 && playerData.gold.sacks > 0) { playerData.gold.pouches += 10; playerData.gold.sacks -= 1; }
        if (playerData.gold.sacks >= 2) { 
            const modal = document.getElementById('bank-modal');
            if (modal) modal.style.display = 'flex'; 
        }
    }

    function getEmptyEquipmentSlot(playerData, itemType) {
        if (itemType === 'large_weapon' || itemType === 'small_weapon') {
            if (!playerData.equipment.primary_weapon) return 'primary_weapon';
            if (!playerData.equipment.secondary_weapon) return 'secondary_weapon';
        }
        if (itemType === 'armor' && !playerData.equipment.chest) return 'chest';
        if (itemType === 'clothing') {
            const clothingSlots = ['head', 'face', 'neck', 'chest', 'arms', 'gloves', 'waist', 'legs', 'feet'];
            for (const slot of clothingSlots) { if(!playerData.equipment[slot]) return slot; }
        }
        const generalIndex = playerData.equipment.general.findIndex(slot => slot === null);
        if (generalIndex !== -1) return `general:${generalIndex}`;
        return null;
    }

    function setupEventListeners() {
        try {
            // Player selector
            const playerSelector = document.getElementById('player-selector');
            if (playerSelector) {
                playerSelector.addEventListener('change', (e) => {
                    localState.viewedPlayerId = e.target.value;
                    render();
                });
            }
            
            // Backpack selector
            const backpackSelector = document.getElementById('backpack-selector');
            if (backpackSelector) {
                backpackSelector.addEventListener('change', async (e) => {
                    const playerData = getPlayerData(localState.viewedPlayerId);
                    playerData.backpackType = e.target.value;
                    await saveData();
                    render();
                });
            }
            
            // Add item form
            const addItemForm = document.getElementById('add-item-form');
            if (addItemForm) {
                addItemForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        const playerData = getPlayerData(localState.viewedPlayerId);
                        const name = document.getElementById('item-name').value;
                        const type = document.getElementById('item-type').value;
                        const desc = document.getElementById('item-desc').value;
                        const features = document.getElementById('item-features').value;
                        
                        if (type === 'arrows') {
                            const existingArrows = playerData.inventory.find(item => item.type === 'arrows' && item.name.toLowerCase() === name.toLowerCase());
                            if (existingArrows) { existingArrows.quantity += 5; } else { playerData.inventory.push({ name, type, desc, features, quantity: 5, id: Date.now() }); }
                        } else {
                            playerData.inventory.push({ name, type, desc, features, id: Date.now() });
                        }
                        await saveData();
                        render();
                        e.target.reset();
                    } catch (error) {
                        console.error("Error adding item:", error);
                    }
                });
            }
            
            // Main content click handler
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.addEventListener('click', async (e) => {
                    try {
                        const playerData = getPlayerData(localState.viewedPlayerId);
                        
                        if (e.target.classList.contains('equip-btn')) {
                            const itemIndex = parseInt(e.target.dataset.index);
                            const item = playerData.inventory[itemIndex];
                            const slot = getEmptyEquipmentSlot(playerData, item.type);
                            if(slot) {
                                if (slot.startsWith('general:')) {
                                    const generalIndex = parseInt(slot.split(':')[1]);
                                    playerData.equipment.general[generalIndex] = item;
                                } else { playerData.equipment[slot] = item; }
                                playerData.inventory.splice(itemIndex, 1);
                                await saveData();
                                render();
                            } else { alert("No available slot to equip this item!"); }
                        }
                        
                        if (e.target.classList.contains('unequip-btn')) {
                            const slot = e.target.dataset.slot;
                            let itemToUnequip;
                            if (slot === 'general') {
                                const index = parseInt(e.target.dataset.index);
                                itemToUnequip = playerData.equipment.general[index];
                                playerData.equipment.general[index] = null;
                            } else {
                                itemToUnequip = playerData.equipment[slot];
                                playerData.equipment[slot] = null;
                            }
                            if (itemToUnequip) {
                                playerData.inventory.push(itemToUnequip);
                                await saveData();
                                render();
                            }
                        }
                        
                        if (e.target.classList.contains('delete-btn')) {
                            const itemIndex = parseInt(e.target.dataset.index);
                            if (confirm(`Are you sure you want to delete "${playerData.inventory[itemIndex].name}"?`)) {
                                playerData.inventory.splice(itemIndex, 1);
                                await saveData();
                                render();
                            }
                        }
                    } catch (error) {
                        console.error("Error handling main content click:", error);
                    }
                });
            }

            // Gold tracker
            const goldTracker = document.querySelector('.gold-tracker');
            if (goldTracker) {
                goldTracker.addEventListener('click', async (e) => {
                    if (e.target.classList.contains('gold-btn')) {
                        try {
                            const playerData = getPlayerData(localState.viewedPlayerId);
                            const { action, unit } = e.target.dataset;
                            const amount = (action === 'add') ? 1 : -1;
                            playerData.gold[unit] += amount;
                            if(playerData.gold[unit] < 0) playerData.gold[unit] = 0;
                            handleGoldConversion(playerData);
                            await saveData();
                            render();
                        } catch (error) {
                            console.error("Error handling gold button:", error);
                        }
                    }
                });
            }

            // Bank form
            const bankForm = document.getElementById('bank-form');
            if (bankForm) {
                bankForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        const playerData = getPlayerData(localState.viewedPlayerId);
                        const location = document.getElementById('bank-location-input').value;
                        playerData.bankLocation = location;
                        playerData.gold.sacks -= 2;
                        await saveData();
                        
                        const modal = document.getElementById('bank-modal');
                        if (modal) modal.style.display = 'none';
                        
                        e.target.reset();
                        render();
                    } catch (error) {
                        console.error("Error handling bank form:", error);
                    }
                });
            }
            
            console.log("Event listeners set up successfully");
        } catch (error) {
            console.error("Error setting up event listeners:", error);
        }
    }
    
    // Main execution
    async function initializeApp() {
        try {
            console.log("Initializing app...");
            
            const player = await OBR.player.get();
            localState.currentUserId = player.id;
            localState.viewedPlayerId = player.id;
            localState.isGM = player.role === "GM";
            
            console.log("Player info:", { id: player.id, name: player.name, role: player.role });
            
            await loadData();
            getPlayerData(localState.currentUserId);
            
            // Set up party change listener
            OBR.party.onChange(async () => {
                console.log("Party changed, updating player selector");
                await renderPlayerSelector();
            });
            
            // Set up metadata change listener
            OBR.room.onMetadataChange(async (metadata) => {
                console.log("Metadata changed");
                localState.players = metadata[METADATA_KEY] || {};
                render();
            });
            
            setupEventListeners();
            render();
            
            console.log("App initialization complete!");
        } catch (error) {
            console.error("Error initializing app:", error);
        }
    }
    
    // Start the app
    initializeApp();
}

// Start initialization when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

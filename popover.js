// More robust initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    initialize();
});

function initialize() {
    console.log("Initialize called, checking for OBR...");
    
    if (typeof OBR !== 'undefined' && OBR.isReady) {
        console.log("OBR is ready immediately");
        main();
    } else if (typeof OBR !== 'undefined') {
        console.log("OBR exists but not ready, waiting for onReady...");
        OBR.onReady(() => {
            console.log("OBR.onReady fired");
            main();
        });
    } else {
        console.log("OBR not found, retrying in 100ms...");
        setTimeout(initialize, 100);
    }
}

function main() {
    console.log("Main function started");
    
    try {
        // Set popover dimensions
        OBR.popover.setHeight(60);
        OBR.popover.setWidth(170);
        console.log("Popover dimensions set");

        const button = document.getElementById("open-inventory");
        console.log("Button found:", button);

        if (button) {
            // Remove any existing listeners
            button.onclick = null;
            
            // Add click event listener
            button.addEventListener('click', handleButtonClick);
            
            // Also add onclick as backup
            button.onclick = handleButtonClick;
            
            console.log("Event listeners attached to button");
        } else {
            console.error("Button with id 'open-inventory' not found!");
        }
    } catch (error) {
        console.error("Error in main function:", error);
    }
}

function handleButtonClick(event) {
    console.log("Button clicked! Event:", event);
    
    try {
        const button = document.getElementById("open-inventory");
        if (button) {
            button.textContent = "Opening...";
            button.disabled = true;
        }
        
        console.log("About to open modal...");
        
        OBR.modal.open({
            id: "com.example.inventory/modal",
            url: "/inventory.html", // Use relative path
            width: 800,
            height: 700
        }).then(() => {
            console.log("Modal opened successfully");
            if (button) {
                button.textContent = "Open Inventory";
                button.disabled = false;
            }
        }).catch(error => {
            console.error("Error opening modal:", error);
            if (button) {
                button.textContent = "Open Inventory";
                button.disabled = false;
            }
        });
        
    } catch (error) {
        console.error("Error in handleButtonClick:", error);
    }
}

// Start initialization immediately if script loads after DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

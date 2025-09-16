function main() {
    console.log("Step 1: main() function has started.");

    OBR.onReady(() => {
        console.log("Step 2: OBR.onReady() callback has fired.");

        OBR.popover.setHeight(60);
        OBR.popover.setWidth(170);
        console.log("Step 3: Popover dimensions have been set.");

        const button = document.getElementById("open-inventory");
        console.log("Step 4: Searched for button. Result:", button);

        if (button) {
            console.log("Step 5: Button was found! Attaching .onclick handler.");
            button.onclick = () => {
                console.log("Step 6: SUCCESS! The .onclick handler has fired!");
                button.textContent = "Clicked!";
                OBR.modal.open({
                    id: "com.example.inventory/modal",
                    url: "https://zevankai.github.io/OwlBearInventory/inventory.html",
                    width: 800,
                    height: 700
                });
            };
        } else {
            console.error("CRITICAL FAILURE: Button with id 'open-inventory' was NOT found.");
        }
    });
}

function initialize() {
    if (window.OBR) {
        main();
    } else {
        setTimeout(initialize, 100);
    }
}

// We call initialize() directly, which will poll for the OBR object.
initialize();

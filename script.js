// --- Configuration ---
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxIjSr7R7vYuW8dXJR1zPnbCURL_3ALz2mnYr9WebskhPKgbUDCXSBLHM0X4Hiz8_qjpQ/exec";
const SPREADSHEET_ID = "1tvE1IDZKQLje2K64Et0nQy0jTlOcnLOPma6Ys_ZWciI";

// --- Data containers ---
let lotListings = [];
let lotImages = {};
let bidBoard = {};

// --- Utility to fetch Google Sheet tab as JSON ---
const sheetToJSON = (sheetName) => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

async function fetchSheetData(sheetName) {
    const response = await fetch(sheetToJSON(sheetName));
    const text = await response.text();
    const json = JSON.parse(text.substring(47, text.length-2));
    return json.table.rows;
}

// --- Initialize data ---
async function initializeData() {
    try {
        const lotRows = await fetchSheetData("Lot Listings");
        lotRows.forEach(row => {
            const lot = row.c[0]?.v;
            const url = row.c[1]?.v;
            if (lot) {
                lotListings.push(lot);
                lotImages[lot] = url;
            }
        });

        const bidRows = await fetchSheetData("Bid Board");
        bidRows.forEach(row => {
            const lot = row.c[0]?.v;
            const currentBid = row.c[1]?.v || 0;
            if (lot) bidBoard[lot] = currentBid;
        });

        populateSaleLots();
    } catch (error) {
        console.error("Error initializing data:", error);
        alert("Failed to load sale lots. Please refresh the page.");
    }
}

// --- Populate dropdown ---
function populateSaleLots() {
    const select = document.getElementById("saleLot");
    lotListings.forEach(lot => {
        const option = document.createElement("option");
        option.value = lot;
        option.textContent = lot;
        select.appendChild(option);
    });
}

// --- Update lot image and autofill bid ---
function updateImage() {
    const lot = document.getElementById("saleLot").value;
    const imgUrl = lotImages[lot];
    const img = document.getElementById("saleImage");

    if (imgUrl) {
        img.src = imgUrl;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }

    const currentBid = bidBoard[lot] || 0;
    const bidInput = document.getElementById("bidAmount");
    const prompt = document.getElementById("bidPrompt");

    if (currentBid < 400) {
        bidInput.value = 400;
        prompt.textContent = "You are placing the opening bid. Minimum starting bid is $400.";
    } else {
        bidInput.value = currentBid + 100;
        prompt.textContent = `Current bid is $${currentBid}. Your bid is autofilled $100 above.`;
    }
}

// --- Clear errors ---
function clearErrors() {
    document.getElementById("saleLotError").textContent = "";
    document.getElementById("nameError").textContent = "";
    document.getElementById("bidNumberError").textContent = "";
    document.getElementById("bidError").textContent = "";
}

// --- Form validation ---
function validateForm() {
    clearErrors();
    let valid = true;

    const lot = document.getElementById("saleLot").value;
    const name = document.getElementById("bidderName").value.trim();
    const bidNumber = document.getElementById("biddingNumber").value.trim();
    const bid = parseInt(document.getElementById("bidAmount").value);

    if (!lot) {
        document.getElementById("saleLotError").textContent = "Please select a Sale Lot.";
        valid = false;
    }
    if (!name) {
        document.getElementById("nameError").textContent = "Please enter your name.";
        valid = false;
    }
    if (!bidNumber) {
        document.getElementById("bidNumberError").textContent = "Please enter your bidding number.";
        valid = false;
    }

    const currentBid = bidBoard[lot] || 0;
    if (bid < 400 || bid <= currentBid) {
        document.getElementById("bidError").textContent = "Bid must be at least $400 and greater than current bid.";
        valid = false;
    }
    if (bid % 100 !== 0) {
        document.getElementById("bidError").textContent = "Bid must be in increments of $100.";
        valid = false;
    }

    return valid;
}

// --- Submit form silently via Web App ---
async function submitForm() {
    if (!validateForm()) return;

    const lot = document.getElementById("saleLot").value;
    const name = document.getElementById("bidderName").value.trim();
    const bidNumber = document.getElementById("biddingNumber").value.trim();
    const bidAmount = document.getElementById("bidAmount").value;

    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: new URLSearchParams({
                saleLot: lot,
                bidderName: name,
                biddingNumber: bidNumber,
                bidAmount: bidAmount
            })
        });

        const result = await response.json();
        console.log(result);

        // Update local bidBoard
        bidBoard[lot] = parseInt(bidAmount);

        // Reset form and hide image
        document.getElementById("bidForm").reset();
        document.getElementById("saleImage").style.display = "none";

        // Show notification
        const notif = document.getElementById("notification");
        notif.style.display = "block";
        setTimeout(() => { notif.style.display = "none"; }, 3000);

    } catch (error) {
        console.error("Error submitting bid:", error);
        alert("Failed to submit bid. Please try again.");
    }
}

// --- Event listeners ---
window.onload = initializeData;
document.getElementById("saleLot").addEventListener("change", updateImage);

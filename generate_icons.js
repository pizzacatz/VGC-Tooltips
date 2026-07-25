const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const scale = size / 128;
    
    ctx.scale(scale, scale);

    const peachColor = '#FFB366';

    // Clear background (transparent)
    ctx.clearRect(0, 0, 128, 128);

    // Dimensions
    const boxX = 14;
    const boxY = 22;
    const boxW = 100;
    const boxH = 85;

    // The Tail
    ctx.fillStyle = peachColor;
    ctx.beginPath();
    ctx.moveTo(boxX + 25, boxY + boxH);
    ctx.lineTo(boxX + 45, boxY + boxH);
    ctx.lineTo(boxX + 35, boxY + boxH + 15);
    ctx.fill();

    // The Chassis Background
    ctx.fillStyle = '#000';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // The Chassis Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = peachColor;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // The Ribbon
    const ribX = boxX + 10;
    const ribY = boxY - 15;
    const ribW = 35;
    const ribH = 15;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(ribX, ribY, ribW, ribH);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(ribX, ribY, ribW, ribH);

    // The Image
    try {
        const image = await loadImage('FavIconSQUARE.png');
        const imgSize = 60;
        const imgX = boxX + (boxW - imgSize) / 2;
        const imgY = boxY + (boxH - imgSize) / 2;
        ctx.drawImage(image, imgX, imgY, imgSize, imgSize);
    } catch (e) {
        console.error("Error loading FavIconSQUARE.png:", e);
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icon${size}.png`, buffer);
    console.log(`Generated icon${size}.png`);
}

async function main() {
    await createIcon(16);
    await createIcon(48);
    await createIcon(128);
}

main();
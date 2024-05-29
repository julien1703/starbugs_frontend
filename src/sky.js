export function createStars(stars) {
    return stars.map(star => ({
        x: Math.random() * window.innerWidth * 2 - window.innerWidth / 2,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight / 2,
        mag: star.mag,
        proper: star.proper || '',
        bayer: star.bayer || '',
        flam: star.flam || '',
    }));
}

export function drawStars(stars, connections = []) {
    const canvas = document.getElementById('sky');
    if (canvas instanceof HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            const radius = Math.max(0.5, 5 - star.mag);
            ctx.beginPath();
            ctx.arc(star.x, star.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();

            ctx.canvas.addEventListener('mousemove', (e) => {
                if (Math.hypot(e.clientX - star.x, e.clientY - star.y) < radius) {
                    ctx.fillText(star.proper, star.x + 10, star.y);
                }
            });
        });

        connections.forEach(connection => {
            const fromStar = stars.find(star => star.proper === connection.from);
            const toStar = stars.find(star => star.proper === connection.to);

            if (fromStar && toStar) {
                ctx.beginPath();
                ctx.moveTo(fromStar.x, fromStar.y);
                ctx.lineTo(toStar.x, toStar.y);
                ctx.strokeStyle = 'yellow';
                ctx.stroke();
            }
        });

        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                offsetX += deltaX;
                offsetY += deltaY;
                ctx.translate(deltaX, deltaY);
                drawStars(stars, connections);
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });
    } else {
        console.error("Canvas element not found or not an HTMLCanvasElement");
    }
}

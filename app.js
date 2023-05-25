window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  const resetButton = document.getElementById('resetButton');
  const ctx = canvas.getContext('2d');
  const image = new Image();
  const originalImageWidth = 3468; // Replace with the original image width
  const originalImageHeight = 4624; // Replace with the original image height
  const points = [];

  let zoomLevel = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Load the image
  image.src = 'image.jpg';
  image.addEventListener('load', () => {
    adjustCanvasSize();
    render();
  });

  // Adjust canvas size based on image aspect ratio
  function adjustCanvasSize() {
    const imageAspectRatio = image.width / image.height;
    const screenHeight = window.innerHeight * 0.8;
    const screenWidth = screenHeight * imageAspectRatio;

    canvas.width = screenWidth;
    canvas.height = screenHeight;
  }

  // Event listeners for zooming and panning
  canvas.addEventListener('wheel', handleZoom);
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseout', handleMouseUp);
  canvas.addEventListener('click', handleClick);

  // Reset button event listener
  resetButton.addEventListener('click', handleReset);

  // Zooming
  function handleZoom(event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const zoomIn = event.deltaY < 0;
    const zoomOut = event.deltaY > 0;

    const zoomX = event.clientX - canvas.getBoundingClientRect().left;
    const zoomY = event.clientY - canvas.getBoundingClientRect().top;

    const prevZoomLevel = zoomLevel;
    if (zoomIn) {
      zoomLevel += zoomSpeed;
    } else if (zoomOut) {
      zoomLevel -= zoomSpeed;
      if (zoomLevel < 0.1) {
        zoomLevel = 0.1;
      }
    }

    const zoomFactor = zoomLevel / prevZoomLevel;

    offsetX = zoomX - (zoomX - offsetX) * zoomFactor;
    offsetY = zoomY - (zoomY - offsetY) * zoomFactor;

    render();
  }

  // Panning
  function handleMouseDown(event) {
    if (event.button === 2) {
      isDragging = true;
      dragStartX = event.clientX - offsetX;
      dragStartY = event.clientY - offsetY;
      canvas.style.cursor = 'grabbing';
    }
  }

  function handleMouseMove(event) {
    if (!isDragging) {
      return;
    }

    offsetX = event.clientX - dragStartX;
    offsetY = event.clientY - dragStartY;

    render();
  }

  function handleMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }

  // Reset button handler
  function handleReset() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    points.length = 0; // Clear the points array
    render();
  }

  // Handle click event to add a point
  function handleClick(event) {
    console.log(event)
    if (event.button === 0) {
      // console.log(event)
      // const pointX = (event.clientX - offsetX) / zoomLevel;
      // const pointY = (event.clientY - offsetY) / zoomLevel;

      // points.push({ x: pointX, y: pointY });
      // console.log(event.clientX, event.clientY, pointX, pointY);
      const { width, height } = canvas.getBoundingClientRect();
      const inverseZoomLevel = 1 / zoomLevel;
      const point = {
        x: event.offsetX + offsetX,
        y: event.offsetY + offsetY,
      }
      points.push(point);
      console.log(point, width, height);

      render();
    }
  }

  // Render function
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(offsetX, offsetY);
    ctx.scale(zoomLevel, zoomLevel);

    const imageWidth = image.width;
    const imageHeight = image.height;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const aspectRatio = imageWidth / imageHeight;
    const scaledWidth = canvasWidth;
    const scaledHeight = canvasWidth / aspectRatio;

    const xPos = (canvasWidth - scaledWidth) / 2;
    const yPos = (canvasHeight - scaledHeight) / 2;

    ctx.drawImage(image, xPos, yPos, scaledWidth, scaledHeight);

    // Draw points
    ctx.fillStyle = 'red';
    for (const point of points) {
      let { x, y } = point;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw polygon
    if (points.length >= 3) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.beginPath();
      const startPoint = points[0];
      const x = (startPoint.x * canvasWidth) / originalImageWidth;
      const y = (startPoint.y * canvasHeight) / originalImageHeight;
      ctx.moveTo(x, y);
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        const x = (point.x * canvasWidth) / originalImageWidth;
        const y = (point.y * canvasHeight) / originalImageHeight;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Adjust canvas size on window resize
  window.addEventListener('resize', () => {
    adjustCanvasSize();
    render();
  });
});

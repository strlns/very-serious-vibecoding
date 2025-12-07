(function () {
  // --- Configuration ---
  const CUBE_SIZE = 400; // Fixed pixel size for perfect centering and geometry
  const CONTAINER_ID = "perfect-disco-content-cube-wrapper";
  const STYLE_ID = "perfect-disco-content-cube-styles";

  // --- 1. Preparation and Content Extraction ---
  // Check and cleanup any previous instance
  if (document.getElementById(CONTAINER_ID)) {
    console.warn(
      "The Perfect Disco Cube is already active. Please refresh the page to reset."
    );
    return;
  }

  // IMPORTANT: Temporarily store and clear the current page content
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = "";
  // Ensure the body has no margins and hides any potential overflow
  document.body.style.cssText =
    "background-color: #000; margin: 0; overflow: hidden;";

  // --- 2. Dynamic CSS Injection (Styles for Perfect Cube) ---
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
        /* Keyframes for Continuous 3D Rotation (Smooth) */
        @keyframes rotate-cube {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
        }

        /* Keyframes for Disco Light and Shadow Effect */
        @keyframes disco-light {
            0%, 100% { box-shadow: 0 0 40px #f00; border-color: #f00; }
            16% { box-shadow: 0 0 40px #ff0; border-color: #ff0; }
            33% { box-shadow: 0 0 40px #0f0; border-color: #0f0; }
            50% { box-shadow: 0 0 40px #0ff; border-color: #0ff; }
            66% { box-shadow: 0 0 40px #00f; border-color: #00f; }
            83% { box-shadow: 0 0 40px #f0f; border-color: #f0f; }
        }

        /* 3D Scene Container: Centered using fixed position and translate */
        #${CONTAINER_ID} {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%); /* Perfect centering */
            perspective: 1500px;
            z-index: 99999;
            pointer-events: none;
            width: ${CUBE_SIZE}px; /* Define the size of the container */
            height: ${CUBE_SIZE}px;
        }

        /* The Cube structure */
        .cube {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            /* Initial rotation for clear 3D view */
            transform: rotateX(-30deg) rotateY(45deg); 
            animation: rotate-cube 10s infinite linear;
        }

        /* Cube Faces Styling */
        .face {
            position: absolute;
            width: ${CUBE_SIZE}px; /* Fixed size */
            height: ${CUBE_SIZE}px; /* Fixed size */
            border: 5px solid;
            overflow: hidden;
            opacity: 0.95;
            box-sizing: border-box;
            background-color: rgba(0, 0, 0, 0.4); 

            /* Disco effect applied to border and shadow */
            animation: disco-light 8s infinite step-end;
        }

        /* Page Content inside the face */
        .face-content {
            /* Scale down the entire original page content to fit the cube face */
            transform: scale(0.25); 
            transform-origin: top left;
            /* Dimensions must be scaled up to compensate for the scale() down */
            width: 400%; 
            height: 400%; 
            pointer-events: none;
            filter: saturate(150%) contrast(110%);
        }

        /* Face Transformations */
        .front  { transform: rotateY(0deg) translateZ(${CUBE_SIZE / 2}px); }
        .back   { transform: rotateY(180deg) translateZ(${CUBE_SIZE / 2}px); }
        .right  { transform: rotateY(90deg) translateZ(${CUBE_SIZE / 2}px); }
        .left   { transform: rotateY(-90deg) translateZ(${CUBE_SIZE / 2}px); }
        .top    { transform: rotateX(90deg) translateZ(${CUBE_SIZE / 2}px); }
        .bottom { transform: rotateX(-90deg) translateZ(${CUBE_SIZE / 2}px); }
    `;
  document.head.appendChild(style);

  // --- 3. Construct the 3D Cube with Cloned Content ---
  const container = document.createElement("div");
  container.id = CONTAINER_ID;

  const cube = document.createElement("div");
  cube.className = "cube";

  const faces = ["front", "back", "right", "left", "top", "bottom"];

  // Create six faces by cloning the page content
  faces.forEach((faceName) => {
    const face = document.createElement("div");
    face.className = `face ${faceName}`;

    const content = document.createElement("div");
    content.className = "face-content";
    // Insert the stored HTML content
    content.innerHTML = originalContent;

    face.appendChild(content);
    cube.appendChild(face);
  });

  container.appendChild(cube);
  document.body.appendChild(container);

  // --- Cleanup Function ---
  window.cleanupDiscoCube = function () {
    // Restore original body content and styles
    document.body.innerHTML = originalContent;
    document.body.style.cssText = "";

    const s = document.getElementById(STYLE_ID);
    if (s) s.remove();
    delete window.cleanupDiscoCube;
    console.log("Perfect Disco Cube cleaned up. Page content restored.");
  };

  console.log(
    "💎 Perfect Disco Content Cube is active! Centered and stable. Refresh the page or run window.cleanupDiscoCube() to restore the page."
  );
})();

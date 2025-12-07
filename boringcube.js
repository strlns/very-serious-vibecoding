(function () {
  // --- Configuration ---

  const CUBE_SIZE = 400;

  const CONTAINER_ID = "disco-cube-container-wrapper";

  const STYLE_ID = "disco-cube-styles";

  // Cleanup if the cube is already running

  if (window.cleanupDiscoCube) {
    window.cleanupDiscoCube();
  }

  // --- 1. CSS Styles: Using Fixed Background Attachment for Content Illusion ---

  const style = document.createElement("style");

  style.id = STYLE_ID;

  style.textContent = `

        /* Keyframes for Continuous 3D Rotation */

        @keyframes rotate-cube {

            0% { transform: rotateX(0deg) rotateY(0deg); }

            100% { transform: rotateX(360deg) rotateY(360deg); }

        }


        /* Keyframes for Disco Light and Shadow Effect */

        @keyframes disco-light {

            0%, 100% { box-shadow: 0 0 30px #f00, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #f00; }

            16% { box-shadow: 0 0 30px #ff0, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #ff0; }

            33% { box-shadow: 0 0 30px #0f0, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #0f0; }

            50% { box-shadow: 0 0 30px #0ff, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #0ff; }

            66% { box-shadow: 0 0 30px #00f, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #00f; }

            83% { box-shadow: 0 0 30px #f0f, inset 0 0 10px rgba(255, 255, 255, 0.8); border-color: #f0f; }

        }


        /* 3D Scene Container */

        #${CONTAINER_ID} {

            position: fixed;

            top: 50%;

            left: 50%;

            transform: translate(-50%, -50%);

            perspective: 1500px; /* Increased perspective for better 3D */

            z-index: 99999;

            pointer-events: none;

            width: ${CUBE_SIZE}px;

            height: ${CUBE_SIZE}px;

        }


        /* The Cube structure */

        .cube {

            width: 100%;

            height: 100%;

            position: relative;

            transform-style: preserve-3d; 

            transform: rotateX(-30deg) rotateY(45deg); 

            animation: rotate-cube 10s infinite linear;

        }


        /* Cube Faces Styling */

        .face {

            position: absolute;

            width: ${CUBE_SIZE}px;

            height: ${CUBE_SIZE}px;

            border: 5px solid;

            /* CRUCIAL for Content/Scrolling Illusion */

            background: url(${window.location.href}) no-repeat;

            background-size: cover; /* Attempt to scale page content */

            background-attachment: fixed; /* Makes content scroll with page */

            opacity: 0.95; 

            overflow: hidden;

            

            /* Add a semi-transparent dark overlay to enhance color effect */

            background-color: rgba(0, 0, 0, 0.3);

            background-blend-mode: multiply; /* Blends the color effect with the page content */


            /* Disco effect */

            animation: disco-light 8s infinite step-end;

        }


        /* Face Transformations (These are the same as the reliable cube) */

        .front  { transform: rotateY(0deg) translateZ(${CUBE_SIZE / 2}px); }

        .back   { transform: rotateY(180deg) translateZ(${CUBE_SIZE / 2}px); }

        .right  { transform: rotateY(90deg) translateZ(${CUBE_SIZE / 2}px); }

        .left   { transform: rotateY(-90deg) translateZ(${CUBE_SIZE / 2}px); }

        .top    { transform: rotateX(90deg) translateZ(${CUBE_SIZE / 2}px); }

        .bottom { transform: rotateX(-90deg) translateZ(${CUBE_SIZE / 2}px); }

    `;

  document.head.appendChild(style);

  // --- 2. HTML Structure ---

  const container = document.createElement("div");

  container.id = CONTAINER_ID;

  container.innerHTML = `

        <div class="cube">

            <div class="face front"></div>

            <div class="face back"></div>

            <div class="face right"></div>

            <div class="face left"></div>

            <div class="face top"></div>

            <div class="face bottom"></div>

        </div>

    `;

  document.body.appendChild(container);

  // --- Cleanup Function ---

  window.cleanupDiscoCube = function () {
    const c = document.getElementById(CONTAINER_ID);

    const s = document.getElementById(STYLE_ID);

    if (c) c.remove();

    if (s) s.remove();

    delete window.cleanupDiscoCube;

    console.log("3D Disco Cube cleaned up.");
  };

  console.log(
    "🎉 3D Cube with Page Content Illusion Initiated! The content is projected using background-attachment: fixed. Run window.cleanupDiscoCube() to remove it."
  );
})();

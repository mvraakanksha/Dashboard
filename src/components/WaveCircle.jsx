import React, { useEffect } from "react";

const WaveCircle = ({ title, value }) => {
  // Stop wave when value is zero
  const isZero = Number(value) === 0;

  // Inject animation CSS only once
  useEffect(() => {
    const waveAnimationCSS = `
      @keyframes rotateWave {
        0%   { transform: rotate(0deg); }
        50%  { transform: rotate(180deg); }
        100% { transform: rotate(360deg); }
      }

      .waveLayer {
        position: absolute;
        width: 200%;
        height: 200%;
        border-radius: 40%;
        top: 45%;
        left: -50%;
        animation: rotateWave 6s linear infinite;
      }

      /* Blue wave (bottom) */
      .waveBlue {
        background: rgba(6, 48, 185, 0.7);
        z-index: 1;
      }

      /* Top wave */
      .waveWhite {
        background:  rgba(23, 124, 248, 0.65);
        animation-duration: 9s;
        top: 42%;
        z-index: 2;
      }
    `;

    if (!document.getElementById("wave-style")) {
      const styleTag = document.createElement("style");
      styleTag.id = "wave-style";
      styleTag.innerHTML = waveAnimationCSS;
      document.head.appendChild(styleTag);
    }
  }, []);

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>{title}</h3>

      <div style={styles.circleWrapper}>
        <div style={styles.circleOuter}>
          <div style={styles.circleInner}>

            {/* Waves */}
            <div style={styles.waveContainer}>
              <div
                className="waveLayer waveBlue"
                style={{ animationPlayState: isZero ? "paused" : "running" }}
              />
              <div
                className="waveLayer waveWhite"
                style={{ animationPlayState: isZero ? "paused" : "running" }}
              />
            </div>

            {/* Center Value */}
            <div style={styles.centerValue}>{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveCircle;

// 🎨 Inline Styles
const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  title: {
    color: "#003c8f",
    fontWeight: "600",
    marginBottom: "10px",
    textAlign: "center",
  },

  circleWrapper: {
    display: "flex",
    justifyContent: "center",
  },

  circleOuter: {
    width: 250,
    height: 250,
    borderRadius: "50%",
    border: "4px solid #003c8f",
    padding: 7,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  circleInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(to bottom, #0a3cff, #1e6bff)",
  },

  // ✅ KEY FIX: white background here
  waveContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },

  centerValue: {
    position: "absolute",
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "bold",
    zIndex: 3,
  },
};


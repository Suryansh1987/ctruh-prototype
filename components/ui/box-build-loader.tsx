"use client";

import React from "react";

type BoxBuildLoaderProps = {
  className?: string;
};

export function BoxBuildLoader({ className = "" }: BoxBuildLoaderProps) {
  const loaderCss = `
    .xr-box-loader {
      --duration: 3.2s;
      --primary: #0057ff;
      --primary-light: #4d8dff;
      --primary-soft: #cfe0ff;
      --primary-rgba: rgba(0, 87, 255, 0);
      width: 200px;
      height: 320px;
      position: relative;
      perspective: 900px;
      perspective-origin: 50% 38%;
      transform-style: preserve-3d;
    }

    @media (max-width: 480px) {
      .xr-box-loader {
        zoom: 1;
      }
    }

    .xr-box-loader:before,
    .xr-box-loader:after {
      --r: 20.5deg;
      content: "";
      width: 320px;
      height: 140px;
      position: absolute;
      right: 32%;
      bottom: -11px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 248, 255, 0.82));
      transform: translateZ(180px) rotate(var(--r));
      animation: xr-box-mask var(--duration) linear forwards infinite;
    }

    .xr-box-loader:after {
      --r: -20.5deg;
      right: auto;
      left: 32%;
    }

    .xr-box-loader .ground {
      position: absolute;
      left: -50px;
      bottom: -120px;
      transform-style: preserve-3d;
      transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1);
    }

    .xr-box-loader .ground div {
      transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0);
      width: 200px;
      height: 200px;
      background: linear-gradient(
        45deg,
        rgba(0, 87, 255, 0.82) 0%,
        rgba(0, 87, 255, 0.96) 48%,
        rgba(77, 141, 255, 0.96) 48%,
        rgba(77, 141, 255, 0.82) 100%
      );
      border-radius: 10px;
      transform-style: preserve-3d;
      box-shadow: 0 24px 55px rgba(0, 87, 255, 0.16);
      animation: xr-box-ground var(--duration) linear forwards infinite;
    }

    .xr-box-loader .ground div:before,
    .xr-box-loader .ground div:after {
      --rx: 90deg;
      --ry: 0deg;
      --x: 44px;
      --y: 162px;
      --z: -50px;
      content: "";
      width: 156px;
      height: 300px;
      opacity: 0;
      background: linear-gradient(rgba(0, 87, 255, 0.28), rgba(0, 87, 255, 0));
      position: absolute;
      transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
      animation: xr-box-ground-shine var(--duration) linear forwards infinite;
    }

    .xr-box-loader .ground div:after {
      --rx: 90deg;
      --ry: 90deg;
      --x: 0;
      --y: 177px;
      --z: 150px;
    }

    .xr-box-loader .box {
      --x: 0;
      --y: 0;
      position: absolute;
      animation: var(--duration) linear forwards infinite;
      transform: translate(var(--x), var(--y));
    }

    .xr-box-loader .box div {
      background: linear-gradient(145deg, #7fb0ff 0%, var(--primary-light) 38%, var(--primary) 100%);
      width: 48px;
      height: 48px;
      position: relative;
      border-radius: 5px;
      transform-style: preserve-3d;
      animation: var(--duration) ease forwards infinite;
      transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0);
      box-shadow: 0 10px 24px rgba(0, 87, 255, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.38);
      backface-visibility: hidden;
      opacity: 0;
    }

    .xr-box-loader .box div:before,
    .xr-box-loader .box div:after {
      --rx: 90deg;
      --ry: 0deg;
      --z: 24px;
      --y: -24px;
      --x: 0;
      content: "";
      position: absolute;
      background: linear-gradient(145deg, #cfe0ff 0%, #8bb6ff 52%, var(--primary-light) 100%);
      width: inherit;
      height: inherit;
      border-radius: inherit;
      transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
      filter: brightness(var(--b, 1.08));
      border: 1px solid rgba(255, 255, 255, 0.32);
      backface-visibility: hidden;
    }

    .xr-box-loader .box div:after {
      --rx: 0deg;
      --ry: 90deg;
      --x: 24px;
      --y: 0;
      --b: 0.92;
    }

    .xr-box-loader .box.box0 { --x: -220px; --y: -120px; left: 58px; top: 108px; animation-name: xr-box-move0; }
    .xr-box-loader .box.box0 div { animation-name: xr-box-scale0; }
    .xr-box-loader .box.box1 { --x: -260px; --y: 120px; left: 25px; top: 120px; animation-name: xr-box-move1; }
    .xr-box-loader .box.box1 div { animation-name: xr-box-scale1; }
    .xr-box-loader .box.box2 { --x: 120px; --y: -190px; left: 58px; top: 64px; animation-name: xr-box-move2; }
    .xr-box-loader .box.box2 div { animation-name: xr-box-scale2; }
    .xr-box-loader .box.box3 { --x: 280px; --y: -40px; left: 91px; top: 120px; animation-name: xr-box-move3; }
    .xr-box-loader .box.box3 div { animation-name: xr-box-scale3; }
    .xr-box-loader .box.box4 { --x: 60px; --y: 200px; left: 58px; top: 132px; animation-name: xr-box-move4; }
    .xr-box-loader .box.box4 div { animation-name: xr-box-scale4; }
    .xr-box-loader .box.box5 { --x: -220px; --y: -120px; left: 25px; top: 76px; animation-name: xr-box-move5; }
    .xr-box-loader .box.box5 div { animation-name: xr-box-scale5; }
    .xr-box-loader .box.box6 { --x: -260px; --y: 120px; left: 91px; top: 76px; animation-name: xr-box-move6; }
    .xr-box-loader .box.box6 div { animation-name: xr-box-scale6; }
    .xr-box-loader .box.box7 { --x: -240px; --y: 200px; left: 58px; top: 87px; animation-name: xr-box-move7; }
    .xr-box-loader .box.box7 div { animation-name: xr-box-scale7; }

    @keyframes xr-box-move0 { 12% { transform: translate(var(--x), var(--y)); } 25%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale0 { 6% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 14%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move1 { 16% { transform: translate(var(--x), var(--y)); } 29%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale1 { 10% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 18%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move2 { 20% { transform: translate(var(--x), var(--y)); } 33%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale2 { 14% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 22%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move3 { 24% { transform: translate(var(--x), var(--y)); } 37%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale3 { 18% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 26%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move4 { 28% { transform: translate(var(--x), var(--y)); } 41%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale4 { 22% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 30%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move5 { 32% { transform: translate(var(--x), var(--y)); } 45%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale5 { 26% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 34%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move6 { 36% { transform: translate(var(--x), var(--y)); } 49%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale6 { 30% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 38%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }
    @keyframes xr-box-move7 { 40% { transform: translate(var(--x), var(--y)); } 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
    @keyframes xr-box-scale7 { 34% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); opacity: 0; } 42%, 79% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 1; } 81%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); opacity: 0; } }

    @keyframes xr-box-ground { 0%, 65% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); } 75%, 90% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(1); } 100% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); } }
    @keyframes xr-box-ground-shine { 0%, 70% { opacity: 0; } 75%, 87% { opacity: 0.18; } 100% { opacity: 0; } }
    @keyframes xr-box-mask { 0%, 65% { opacity: 0; } 66%, 100% { opacity: 1; } }
  `;

  const boxes = [...Array(8).keys()];

  return (
    <>
      <style>{loaderCss}</style>
      <div className={`relative h-[180px] w-[128px] sm:h-[210px] sm:w-[144px] ${className}`.trim()} aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] scale-[0.46] sm:scale-[0.54]">
          <div className="xr-box-loader">
            {boxes.map((index) => (
              <div key={index} className={`box box${index}`}>
                <div />
              </div>
            ))}
            <div className="ground">
              <div />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

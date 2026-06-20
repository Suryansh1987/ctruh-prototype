"use client";

import Image from "next/image";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

const SLIDES = [
  { src: "/generated/discover-any-store.png", headline: "Discover Any Store" },
  { src: "/generated/inventory-intelligence.png", headline: "Inventory Intelligence" },
  { src: "/generated/product-analysis.png", headline: "Product Analysis" },
  { src: "/generated/hidden-opportunities.png", headline: "Hidden Opportunities" },
  { src: "/generated/business-impact.png", headline: "Business Impact" },
  { src: "/generated/xr-experience-blueprint.png", headline: "XR Experience Blueprint" },
  { src: "/generated/clear-recommendations.png", headline: "Clear Recommendations" },
  { src: "/generated/future-store-experience.png", headline: "Future Store Experience" },
] as const;

function getSlidePosition(index: number, activeIndex: number, total: number) {
  if (index === activeIndex) return "active";
  if (index === (activeIndex - 1 + total) % total) return "previous";
  if (index === (activeIndex + 1) % total) return "next";
  return "hidden";
}

export function RightPanelCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = SLIDES.length;

  function goTo(index: number) {
    const normalized = (index + totalSlides) % totalSlides;
    startTransition(() => {
      setActiveIndex(normalized);
    });
  }

  function shiftBy(delta: number) {
    startTransition(() => {
      setActiveIndex((current) => (current + delta + totalSlides) % totalSlides);
    });
  }

  const autoplayAdvance = useEffectEvent(() => {
    shiftBy(1);
  });

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setTimeout(() => {
      autoplayAdvance();
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [activeIndex, isPaused]);

  const activeSlide = SLIDES[activeIndex];

  return (
    <section
      className="xr-right-carousel"
      aria-roledescription="carousel"
      aria-label="CTRUH storytelling carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="xr-right-carousel-copy">
        <div className="xr-right-carousel-step">
          {`STEP ${String(activeIndex + 1).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`}
        </div>
        <h2 className="xr-right-carousel-headline">{activeSlide.headline}</h2>
      </div>

      <div className="xr-right-carousel-stage">
        <button
          type="button"
          className="xr-right-carousel-arrow xr-right-carousel-arrow-left"
          onClick={() => shiftBy(-1)}
          aria-label="Previous slide"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="xr-right-carousel-frame">
          {SLIDES.map((slide, index) => {
            const position = getSlidePosition(index, activeIndex, totalSlides);

            return (
              <div
                key={slide.src}
                className={`xr-right-carousel-slide is-${position}`}
                aria-hidden={position !== "active"}
              >
                <Image
                  src={slide.src}
                  alt={slide.headline}
                  fill
                  sizes="(max-width: 767px) 0px, 560px"
                  priority={index === 0}
                  className="xr-right-carousel-image"
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="xr-right-carousel-arrow xr-right-carousel-arrow-right"
          onClick={() => shiftBy(1)}
          aria-label="Next slide"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="xr-right-carousel-dots" role="tablist" aria-label="Carousel steps">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Go to step ${index + 1}: ${slide.headline}`}
            className={`xr-right-carousel-dot ${index === activeIndex ? "is-active" : ""}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </section>
  );
}

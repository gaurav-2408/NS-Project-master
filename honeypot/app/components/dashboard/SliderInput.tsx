"use client";

import React, { useState, useRef, useEffect } from "react";

interface SliderInputProps {
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  value?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  color?: "blue" | "red" | "green" | "purple";
  marks?: boolean | number[];
}

const SliderInput: React.FC<SliderInputProps> = ({
  min,
  max,
  step = 1,
  defaultValue,
  value: controlledValue,
  onChange,
  onChangeEnd,
  label,
  showValue = true,
  disabled = false,
  className = "",
  valueFormatter,
  color = "blue",
  marks = false,
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<number>(
    isControlled ? controlledValue : defaultValue || min
  );
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Get the correct color classes based on the color prop
  const getColorClasses = () => {
    switch (color) {
      case "red":
        return "bg-red-500";
      case "green":
        return "bg-green-500";
      case "purple":
        return "bg-purple-500";
      case "blue":
      default:
        return "bg-blue-500";
    }
  };

  // Update internal value when controlled value changes
  useEffect(() => {
    if (isControlled && controlledValue !== internalValue) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue, isControlled, internalValue]);

  // Calculate percentage of current value within the range
  const calculatePercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  // Update value based on pointer position
  const updateValueFromPosition = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );
    const rawValue = min + percentage * (max - min);

    // Round to nearest step
    const steppedValue = Math.round(rawValue / step) * step;
    const newValue = Math.max(min, Math.min(max, steppedValue));

    if (newValue !== internalValue) {
      setInternalValue(newValue);
      if (onChange) onChange(newValue);
    }
  };

  // Handle mouse/touch events for drag functionality
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValueFromPosition(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    updateValueFromPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (onChangeEnd) onChangeEnd(internalValue);
  };

  // Handle click on the track
  const handleTrackClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (disabled) return;
    updateValueFromPosition(e.clientX);
  };

  // Generate marks if enabled
  const renderMarks = () => {
    if (!marks) return null;

    const markValues = Array.isArray(marks)
      ? marks
      : Array.from(
          { length: Math.floor((max - min) / step) + 1 },
          (_, i) => min + i * step
        );

    return (
      <div className="absolute w-full top-1/2 transform -translate-y-1/2">
        {markValues.map((markValue) => {
          const percentage = calculatePercentage(markValue);
          const isActive = internalValue >= markValue;
          return (
            <div
              key={markValue}
              className={`absolute w-1 h-1 rounded-full transform -translate-x-1/2 ${
                isActive ? getColorClasses() : "bg-gray-300"
              }`}
              style={{ left: `${percentage}%` }}
            />
          );
        })}
      </div>
    );
  };

  // Format the displayed value
  const formattedValue = valueFormatter
    ? valueFormatter(internalValue)
    : internalValue.toString();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label and value display */}
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-sm font-medium text-gray-700">{label}</label>
          )}
          {showValue && (
            <span className="text-sm text-gray-600 font-mono">
              {formattedValue}
            </span>
          )}
        </div>
      )}

      {/* Slider track */}
      <div className="h-10 flex items-center relative">
        <div
          ref={sliderRef}
          onClick={handleTrackClick}
          className={`relative w-full h-2 rounded-full bg-gray-200 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {/* Filled track */}
          <div
            className={`absolute h-full rounded-full ${getColorClasses()}`}
            style={{ width: `${calculatePercentage(internalValue)}%` }}
          ></div>

          {renderMarks()}
        </div>

        {/* Thumb */}
        <div
          className={`absolute w-5 h-5 rounded-full ${getColorClasses()} shadow-lg transform -translate-x-1/2 focus:ring-2 focus:ring-offset-2 focus:${
            color === "blue" ? "ring-blue-300" : `ring-${color}-300`
          } ${isDragging ? "scale-110" : ""} transition-transform ${
            disabled ? "cursor-not-allowed" : "cursor-grab"
          }`}
          style={{ left: `${calculatePercentage(internalValue)}%` }}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={internalValue}
          aria-disabled={disabled}
          aria-label={label || "slider"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => {
            if (disabled) return;

            let newValue = internalValue;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              newValue = Math.min(max, internalValue + step);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              newValue = Math.max(min, internalValue - step);
            } else if (e.key === "Home") {
              newValue = min;
            } else if (e.key === "End") {
              newValue = max;
            } else {
              return;
            }

            setInternalValue(newValue);
            if (onChange) onChange(newValue);
          }}
        ></div>
      </div>

      {/* Min and max labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{valueFormatter ? valueFormatter(min) : min}</span>
        <span>{valueFormatter ? valueFormatter(max) : max}</span>
      </div>
    </div>
  );
};

export default SliderInput;

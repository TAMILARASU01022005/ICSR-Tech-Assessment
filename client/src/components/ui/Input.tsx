"use client";

import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      showPasswordToggle = true,
      className = "",
      id,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const hasToggle = isPassword && showPasswordToggle;

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const resolvedType = hasToggle ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-zinc-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            className={`w-full h-10 px-3 ${leftIcon ? "pl-9" : ""} ${
              hasToggle || rightIcon ? "pr-10" : ""
            } text-sm bg-white dark:bg-zinc-900 border rounded-lg transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              error
                ? "border-rose-400 focus:ring-rose-500 text-rose-900 dark:text-rose-200"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400"
            } disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {hasToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors focus:outline-none p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              tabIndex={-1}
            >
              {showPassword ? (
                <FiEyeOff className="w-4 h-4" />
              ) : (
                <FiEye className="w-4 h-4" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-zinc-400">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="text-xs text-rose-500 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

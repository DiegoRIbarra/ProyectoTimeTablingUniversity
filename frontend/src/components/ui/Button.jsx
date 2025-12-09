import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary hover:bg-primary-hover text-white focus:ring-primary/50",
        danger: "bg-danger hover:bg-danger-hover text-white focus:ring-danger/50",
        secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-200",
        ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;

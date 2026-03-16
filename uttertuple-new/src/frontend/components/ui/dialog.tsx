import React from "react";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ 
  open, 
  onOpenChange, 
  children 
}) => {
  if (!open) return null;
  
  return (
    <div className="dialog-wrapper">
      {children}
    </div>
  );
};

export interface DialogContentProps {
  children?: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ 
  children,
  className = ""
}) => {
  return (
    <div className={`dialog-content ${className}`}>
      {children}
    </div>
  );
};

export interface DialogHeaderProps {
  children?: React.ReactNode;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ 
  children 
}) => {
  return (
    <div className="dialog-header">
      {children}
    </div>
  );
};

export interface DialogTitleProps {
  children?: React.ReactNode;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ 
  children 
}) => {
  return (
    <h2 className="dialog-title">
      {children}
    </h2>
  );
};

export interface DialogDescriptionProps {
  children?: React.ReactNode;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ 
  children 
}) => {
  return (
    <p className="dialog-description">
      {children}
    </p>
  );
};

export interface DialogFooterProps {
  children?: React.ReactNode;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ 
  children 
}) => {
  return (
    <div className="dialog-footer">
      {children}
    </div>
  );
}; 
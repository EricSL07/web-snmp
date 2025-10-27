"use client";
import React from "react";

export default function Card({ title, actions, children }: { title?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm w-full">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-lg font-semibold text-black">{title}</h3> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

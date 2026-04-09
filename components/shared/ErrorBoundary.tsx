"use client";

import React from "react";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[ErrorBoundary] ${this.props.moduleName ?? "Unknown"}:`, error);
    toast.error(`Có lỗi xảy ra${this.props.moduleName ? ` ở ${this.props.moduleName}` : ""}`, {
      description: "Vui lòng thử tải lại trang",
      duration: 5000,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-200">
            Có lỗi xảy ra
          </h2>
          <p className="text-slate-400 text-sm">
            {this.state.error?.message ?? "Lỗi không xác định"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

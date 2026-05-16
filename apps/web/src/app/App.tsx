import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ToastProvider } from "../components/toast/ToastProvider";
import { AuthProvider } from "../features/auth/auth-context";
import { queryClient } from "../lib/query-client";
import { router } from "./router";

export function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
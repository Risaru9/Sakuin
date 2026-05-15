import { RouterProvider } from "react-router-dom";
import { ToastProvider } from "../components/toast/ToastProvider";
import { AuthProvider } from "../features/auth/auth-context";
import { router } from "./router";

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
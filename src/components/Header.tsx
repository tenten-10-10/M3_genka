import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { signOut } from "../lib/api";
import type { ReactNode } from "react";

export default function Header({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await signOut();
    nav("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <span className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/")}>
        商品企画書 / 原価表
      </span>
      {children}
      <span className="spacer" />
      <span className="user">{user?.email}</span>
      <button className="btn-ghost" style={{ color: "#fff" }} onClick={logout}>
        ログアウト
      </button>
    </header>
  );
}

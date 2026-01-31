import { Outlet } from "react-router-dom";

export default function EmbedWrapper() {
  return (
    <div style={{ padding: "16px", background: "#f5f7fa", minHeight: "100vh" }}>
      <Outlet />
    </div>
  );
}

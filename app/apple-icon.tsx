import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Touch icon: the doorway mark from design/Favicon.dc.html at 180 px.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          background: "#A8402A",
        }}
      >
        <div
          style={{
            width: 68,
            height: 116,
            marginBottom: 34,
            background: "#F3D3A3",
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
          }}
        />
      </div>
    ),
    size,
  );
}

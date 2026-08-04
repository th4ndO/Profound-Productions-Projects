import { ImageResponse } from "next/og";

export const alt = "Profound Productions — Transforming Visions Into Visuals.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1c2326",
          backgroundImage:
            "radial-gradient(circle at 18% 20%, rgba(222,192,146,0.22) 0%, rgba(222,192,146,0) 45%), radial-gradient(circle at 82% 82%, rgba(201,160,106,0.18) 0%, rgba(201,160,106,0) 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 110,
            height: 110,
            borderRadius: 9999,
            border: "2px solid #dec092",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#dec092",
              letterSpacing: 2,
            }}
          >
            PP
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 700,
            color: "#f5f3ef",
            letterSpacing: 1,
          }}
        >
          PROFOUND PRODUCTIONS
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 30,
            color: "#9aa1a4",
          }}
        >
          Transforming Visions Into Visuals.
        </div>
      </div>
    ),
    { ...size }
  );
}

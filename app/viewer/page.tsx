import { ViewerClient } from "./viewer-client";

export default async function ViewerPage({
  searchParams,
}: {
  searchParams: Promise<{ glb?: string; name?: string }>;
}) {
  const { glb, name } = await searchParams;

  if (!glb) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#060d22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
        }}
      >
        No model URL provided.
      </div>
    );
  }

  return <ViewerClient glbUrl={glb} name={name ?? "3D Model"} />;
}

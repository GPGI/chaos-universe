export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("IPFS upload failed");
  const data = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${data.ipfs_hash}`;
};

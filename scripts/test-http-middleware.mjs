async function testRoutes() {
  const rootRes = await fetch("http://localhost:3000/", { redirect: "manual" });
  console.log("GET / -> Status:", rootRes.status, "Location:", rootRes.headers.get("location"));

  const txRes = await fetch("http://localhost:3000/transactions", { redirect: "manual" });
  console.log("GET /transactions -> Status:", txRes.status, "Location:", txRes.headers.get("location"));

  const loginRes = await fetch("http://localhost:3000/login", { redirect: "manual" });
  console.log("GET /login -> Status:", loginRes.status);
}

testRoutes().catch(console.error);

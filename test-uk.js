const key = "Tm9U4A4bvXGp8V3BL5wMFSc3vKZqECQ95p6DaEcNh9Hm00HIe0wpxkz3f11Vsgvx8sB6sCN6sg7izcBesPFP3Q==";

async function testApi() {
  const url1 = `http://apis.data.go.kr/1262000/TravelAlarmService0404/getTravelAlarm0404List?serviceKey=${encodeURIComponent(key)}&cond[country_iso_alp2::EQ]=GB&returnType=JSON`;
  const url2 = `http://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2?ServiceKey=${encodeURIComponent(key)}&cond[country_iso_alp2::EQ]=GB&returnType=JSON`;

  console.log("=== API 15095500 ===");
  try {
    const res1 = await fetch(url1);
    const text1 = await res1.text();
    console.log(text1);
  } catch (e) {
    console.log(e);
  }

  console.log("=== API 15076237 ===");
  try {
    const res2 = await fetch(url2);
    const text2 = await res2.text();
    console.log(text2);
  } catch (e) {
    console.log(e);
  }
}

testApi();

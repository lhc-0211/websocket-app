let secCounter = 0;

onmessage = (e) => {
  if (e.data.type === "inc") {
    secCounter++;
  }
};

setInterval(() => {
  postMessage({
    type: "tick",
    time: new Date().toLocaleTimeString(),
    count: secCounter,
  });
  secCounter = 0;
}, 1000);

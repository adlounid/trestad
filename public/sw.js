self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "3 Städ", body: "Du har en ny uppdatering.", url: "/admin" };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/og.png",
    data: { url: data.url || "/admin" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

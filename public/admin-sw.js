/* 복비 관리자 웹 푸시 서비스 워커 (scope /admin). 알림 보여 주기 + 누르면 관리자 화면 열기 */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/admin') ? data.url : '/admin';
  event.waitUntil(
    self.registration.showNotification(data.title || '복비 관리자', {
      body: data.body || '',
      tag: data.tag,
      icon: '/icon.svg',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/admin', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin + '/admin') && 'focus' in c) {
          return c.navigate(target).then((w) => (w || c).focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

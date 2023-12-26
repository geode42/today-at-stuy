const noCachePaths = ['/unstableapi']

self.addEventListener('fetch', event => {
	event.respondWith(
		(async () => {
			const response = fetch(event.request)
			if (!noCachePaths.includes(new URL(event.request.url).pathname)) {
				event.waitUntil((async () => {
					const awaitedResponse = await response.catch()
					if (awaitedResponse && awaitedResponse.ok) {
						caches.open('all-static').then(async cache => {
							cache.put(event.request.url, awaitedResponse.clone())
						})
					}
				})())
			}
			const cachedResponse = await caches.match(event.request)
			if (cachedResponse) {
				return cachedResponse
			}
			const awaitedResponse = await response.catch()
			if (awaitedResponse) {
				return awaitedResponse.clone()
			}
		})()
	)
})
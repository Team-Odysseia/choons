test:
	cd back && ./gradlew test
	cd front && bun run test

test-back:
	cd back && ./gradlew test

test-front:
	cd front && bun run test

test-watch-front:
	cd front && bun run test:watch

test-verbose:
	cd back && ./gradlew test --info

# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY gradle gradle
COPY gradlew .
COPY build.gradle settings.gradle ./

RUN chmod +x ./gradlew
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon -q dependencies

COPY src src
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

RUN groupadd --system choons && useradd --system --gid choons --create-home --home-dir /home/choons choons

COPY --from=build --chown=choons:choons /app/build/libs/choons-*.jar /app/app.jar

ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -Xms128m -Xmx320m -XX:MaxMetaspaceSize=96m -XX:MaxDirectMemorySize=32m -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

USER choons
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

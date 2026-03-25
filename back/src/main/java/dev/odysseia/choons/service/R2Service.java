package dev.odysseia.choons.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;

import java.io.InputStream;
import java.net.URI;

@Service
public class R2Service {

  @Value("${r2.endpoint}")
  private String endpoint;

  @Value("${r2.bucket-name}")
  private String bucketName;

  @Value("${r2.access-key}")
  private String accessKey;

  @Value("${r2.secret-key}")
  private String secretKey;

  private S3Client s3Client;

  @PostConstruct
  public void init() {
    s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)))
            .region(Region.of("auto"))
            .serviceConfiguration(S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .build())
            .build();
  }

  public void upload(String key, InputStream data, long contentLength, String contentType) {
    s3Client.putObject(
            PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build(),
            RequestBody.fromInputStream(data, contentLength)
    );
  }

  public long getObjectSize(String key) {
    HeadObjectResponse head = s3Client.headObject(req ->
            req.bucket(bucketName).key(key));
    return head.contentLength();
  }

  public ResponseInputStream<GetObjectResponse> getObjectStream(String key, Long rangeStart, Long rangeEnd) {
    GetObjectRequest.Builder builder = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key);

    if (rangeStart != null) {
      String range = "bytes=" + rangeStart + "-" + (rangeEnd != null ? rangeEnd : "");
      builder.range(range);
    }

    return s3Client.getObject(builder.build());
  }

  public void delete(String key) {
    s3Client.deleteObject(req -> req.bucket(bucketName).key(key));
  }
}

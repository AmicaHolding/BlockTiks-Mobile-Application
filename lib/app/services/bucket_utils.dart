import 'dart:convert';
import 'dart:typed_data';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:http/http.dart' as http;

import 'package:amazon_cognito_identity_dart_2/sig_v4.dart' as sigv4;
import 'package:block_tix/app/data/utils/api_utils.dart';

class AWSClient {
  String AWS_ACCESS_KEY_ID = "";
  String AWS_SECRET_ACCESS_KEY = "";
  String AWS_DEFAULT_REGION = "us-east-1";
  String S3_BUCKET = "block_tix-app";

  Future uploadData(String folderName, String fileName, Uint8List data) async {
    final length = data.length;

    final uri = Uri.parse(ApiUtils.s3Endpoint);
    final req = http.MultipartRequest("POST", uri);
    final multipartFile = http.MultipartFile(
        'file', http.ByteStream.fromBytes(data), length,
        filename: fileName);

    final policy = Policy.fromS3PresignedPost(
        '$folderName$fileName', S3_BUCKET, AWS_ACCESS_KEY_ID, 15, length,
        region: AWS_DEFAULT_REGION);
    final key = sigv4.SigV4.calculateSigningKey(
        AWS_SECRET_ACCESS_KEY, policy.datetime, AWS_DEFAULT_REGION, 's3');
    final signature = sigv4.SigV4.calculateSignature(key, policy.encode());

    req.files.add(multipartFile);
    req.fields['key'] = policy.key;
    req.fields['acl'] = 'public-read';
    req.fields['X-Amz-Credential'] = policy.credential;
    req.fields['X-Amz-Algorithm'] = 'AWS4-HMAC-SHA256';
    req.fields['X-Amz-Date'] = policy.datetime;
    req.fields['Policy'] = policy.encode();
    req.fields['X-Amz-Signature'] = signature;

    try {
      final res = await req.send();
      await for (var value in res.stream.transform(utf8.decoder)) {
        debugPrint("Aws successss$value");
        return value.toString();
      }
    } catch (e) {
      debugPrint("Aws errorrrr$e");

      return e;
    }
  }
}

class Policy {
  String expiration;
  String region;
  String bucket;
  String key;
  String credential;
  String datetime;
  int maxFileSize;

  Policy(this.key, this.bucket, this.datetime, this.expiration, this.credential,
      this.maxFileSize,
      {this.region = 'us-east-1'});

  factory Policy.fromS3PresignedPost(
    String key,
    String bucket,
    String accessKeyId,
    int expiryMinutes,
    int maxFileSize, {
    String? region,
  }) {
    final datetime = sigv4.SigV4.generateDatetime();
    final expiration = (DateTime.now())
        .add(Duration(minutes: expiryMinutes))
        .toUtc()
        .toString()
        .split(' ')
        .join('T');
    final cred =
        '$accessKeyId/${sigv4.SigV4.buildCredentialScope(datetime, region!, 's3')}';
    final p = Policy(key, bucket, datetime, expiration, cred, maxFileSize,
        region: region);
    return p;
  }

  String encode() {
    final bytes = utf8.encode(toString());
    return base64.encode(bytes);
  }

  @override
  String toString() {
    return '''
{ "expiration": "$expiration",
  "conditions": [
    {"bucket": "$bucket"},
    ["starts-with", "\$key", "$key"],
    {"acl": "public-read"},
    ["content-length-range", 1, $maxFileSize],
    {"x-amz-credential": "$credential"},
    {"x-amz-algorithm": "AWS4-HMAC-SHA256"},
    {"x-amz-date": "$datetime" }
  ]
}
''';
  }
}

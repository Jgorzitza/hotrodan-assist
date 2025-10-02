# Multi-stage Dockerfile for root utilities (lint/tests) if needed
# Primary app is under dashboard/, which has its own Dockerfile
FROM alpine:3.19 AS noop
CMD ["/bin/sh", "-c", "echo 'Use dashboard/Dockerfile to build the app' && sleep 1"]
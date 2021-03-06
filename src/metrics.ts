import * as promClient from 'prom-client';
import * as grpc from 'grpc';

const histogram = new promClient.Histogram({
  name: 'grpc_response_duration_seconds',
  help: 'Histogram of grpc response in seconds',
  labelNames: ['peer', 'method', 'code'],
});

export function getMetricsInterceptor() {
  return function metricsInterceptor(options, nextCall) {
    const call = nextCall(options);

    const endTimer = histogram.startTimer({
      peer: call.getPeer(),
      method: options.method_definition.path,
    });

    const requester = (new grpc.RequesterBuilder())
        .withStart(function(metadata: grpc.Metadata, _listener: grpc.Listener, next: Function) {
          const newListener = (new grpc.ListenerBuilder())
            .withOnReceiveStatus(function(status: grpc.StatusObject, next: Function) {
              endTimer({
                code: status.code,
              });
              next(status);
            }).build();
          next(metadata, newListener);
        }).build();

    return new grpc.InterceptingCall(call, requester);
  };
}

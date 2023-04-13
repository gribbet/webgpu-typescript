/// <reference types="@webgpu/types" />

const [width, height] = [800, 600];
const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

const start = async () => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);

  const { gpu } = navigator;
  if (!gpu) throw new Error("No GPU");

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error("No adapter");

  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("No WebGPU");

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const positionBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(positionBuffer.getMappedRange()).set(positions);
  positionBuffer.unmap();

  const indexBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  new Uint16Array(indexBuffer.getMappedRange()).set(indices);
  indexBuffer.unmap();

  const sizeUniformBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Uint32Array(sizeUniformBuffer.getMappedRange()).set([width, height]);
  sizeUniformBuffer.unmap();

  const timeUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const load = async (url: URL) => {
    const request = await fetch(url);
    const blob = await request.blob();
    return await blob.text();
  };

  const vertexModule = device.createShaderModule({
    code: await load(new URL("./vertex.wgsl", import.meta.url)),
  });
  const fragmentModule = device.createShaderModule({
    code: await load(new URL("./fragment.wgsl", import.meta.url)),
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
          arrayStride: 4 * 2,
          stepMode: "vertex",
        },
      ],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sizeUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: timeUniformBuffer,
        },
      },
    ],
  });

  const render = (time: number) => {
    const commandEncoder = device.createCommandEncoder();

    const renderTarget = context.getCurrentTexture();
    const renderTargetView = renderTarget.createView();

    const pass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: renderTargetView,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(pipeline);
    pass.setViewport(0, 0, width, height, 0, 1);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(3 * 2, 1);
    pass.end();

    device.queue.writeBuffer(timeUniformBuffer, 0, new Float32Array([time]));
    device.queue.submit([commandEncoder.finish()]);
  };

  const loop = (time: number) => {
    render(time / 1000);
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

start();

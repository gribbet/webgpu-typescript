@group(0) @binding(0) var<uniform> size: vec2<u32>;
@group(0) @binding(1) var<uniform> time: f32;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let a = sin(time) + fract(sin(dot(position.xy / vec2<f32>(size), vec2(12.9898, 78.233))) * 43758.5453);
    return vec4(a, a, a, 1);
}          
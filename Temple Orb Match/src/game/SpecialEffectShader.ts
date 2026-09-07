export class SpecialEffectShader {
    private static readonly NAME = "Match3SpecialGlow2D";
    private static initialized = false;

    public static createMaterial(color: Laya.Color): Laya.Material {
        this.initialize();
        const material = new Laya.Material();
        material.setShaderName(this.NAME);
        material.depthTest = Laya.RenderState.DEPTHTEST_OFF;
        material.cull = Laya.RenderState.CULL_NONE;
        material.blend = Laya.RenderState.BLEND_ENABLE_ALL;
        material.setIntByIndex(Laya.Shader3D.BLEND_SRC, Laya.RenderState.BLENDPARAM_SRC_ALPHA);
        material.setIntByIndex(Laya.Shader3D.BLEND_DST, Laya.RenderState.BLENDPARAM_ONE);
        material.setColor("u_GlowColor", color);
        material.setFloat("u_GlowStrength", 0);
        material.setFloat("u_FlashStrength", 0);
        return material;
    }

    private static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
        const shader = Laya.Shader3D.add(this.NAME, false, false);
        shader.shaderType = Laya.ShaderFeatureType.D2_BaseRenderNode2D;
        const subShader = new Laya.SubShader(Laya.Shader2D.Render2DNodeAttribute, {
            u_GlowColor: Laya.ShaderDataType.Color,
            u_GlowStrength: Laya.ShaderDataType.Float,
            u_FlashStrength: Laya.ShaderDataType.Float,
        });
        shader.addSubShader(subShader);
        subShader.addShaderPass(this.VERTEX, this.FRAGMENT);
    }

    private static readonly VERTEX = `
#define SHADER_NAME Match3SpecialGlow2DVS
#include "Sprite2DVertex.glsl";
void main() {
    vertexInfo info;
    getVertexInfo(info);
    v_texcoord = info.uv;
    v_color = info.color;
#ifdef LIGHT2D_ENABLE
    lightAndShadow(info);
#endif
    gl_Position = getPosition(info.pos);
}`;

    private static readonly FRAGMENT = `
#define SHADER_NAME Match3SpecialGlow2DFS
#if defined(GL_FRAGMENT_PRECISION_HIGH)
precision highp float;
#else
precision mediump float;
#endif
#include "Sprite2DFrag.glsl";
void main() {
    clip();
    vec2 texcoord = v_texcoord.xy * u_tilingOffset.zw + u_tilingOffset.xy;
    vec4 textureColor = texture2D(u_baseRender2DTexture, texcoord);
#ifdef LIGHT2D_ENABLE
    lightAndShadow(textureColor);
#endif
    textureColor = transspaceColor(textureColor);
    float radial = 1.0 - smoothstep(0.04, 0.72, length(texcoord - vec2(0.5)));
    textureColor.rgb = mix(textureColor.rgb, u_GlowColor.rgb * textureColor.a, u_FlashStrength);
    textureColor.rgb += u_GlowColor.rgb * radial * u_GlowStrength * textureColor.a;
    setglColor(textureColor);
}`;
}

export class ShaderPulse {
    public constructor(private readonly material: Laya.Material) {}

    public get glow(): number { return this.material.getFloat("u_GlowStrength"); }
    public set glow(value: number) { this.material.setFloat("u_GlowStrength", value); }
    public get flash(): number { return this.material.getFloat("u_FlashStrength"); }
    public set flash(value: number) { this.material.setFloat("u_FlashStrength", value); }
    public destroy(): void { this.material.destroy(); }
}

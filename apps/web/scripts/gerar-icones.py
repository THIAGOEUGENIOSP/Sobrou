#!/usr/bin/env python3
"""
Gera os ícones da PWA a partir de um desenho só, em vez de manter três PNGs
soltos no repositório sem ninguém lembrar de onde vieram.

Uso: python3 scripts/gerar-icones.py

A marca é um ponteiro de velocímetro com "R$" na abertura do arco: o giro do
carro de um lado, o dinheiro do outro, que é exatamente a conta que o app faz.
O ícone "mascarável" tem margem extra porque o Android recorta o ícone em
círculo, losango ou squircle conforme o aparelho — sem essa folga, o desenho
aparece cortado.
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

SAIDA = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

FUNDO = (11, 18, 32)       # --color-papel no escuro
MARCA = (45, 212, 191)     # --color-marca no escuro
TRILHA = (30, 41, 59)      # arco apagado
TEXTO = (255, 255, 255)


def fonte(tamanho: int):
    for caminho in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(caminho):
            return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default()


def desenhar(tamanho: int, margem_rel: float, cantos: bool) -> Image.Image:
    # Desenha grande e reduz no fim: é o jeito barato de ter antialiasing.
    escala = 4
    lado = tamanho * escala
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if cantos:
        raio = int(lado * 0.22)
        d.rounded_rectangle([0, 0, lado - 1, lado - 1], radius=raio, fill=FUNDO)
    else:
        d.rectangle([0, 0, lado - 1, lado - 1], fill=FUNDO)

    margem = lado * margem_rel
    caixa = [margem, margem, lado - margem, lado - margem]
    largura = int(lado * 0.085)

    # Arco do velocímetro: 160° a 380°, deixando a base aberta.
    d.arc(caixa, start=160, end=380, fill=TRILHA, width=largura)
    d.arc(caixa, start=160, end=305, fill=MARCA, width=largura)

    # Ponteiro apontando para o fim da faixa acesa.
    cx, cy = lado / 2, lado / 2
    raio_ponteiro = (lado / 2 - margem) * 0.62
    ang = math.radians(305)
    px, py = cx + raio_ponteiro * math.cos(ang), cy + raio_ponteiro * math.sin(ang)
    d.line([cx, cy, px, py], fill=TEXTO, width=int(lado * 0.045))
    bolinha = lado * 0.035
    d.ellipse([cx - bolinha, cy - bolinha, cx + bolinha, cy + bolinha], fill=TEXTO)

    # "R$" abaixo do centro, dentro da abertura do arco.
    f = fonte(int(lado * 0.17))
    texto = "R$"
    esq, topo, dir_, base = d.textbbox((0, 0), texto, font=f)
    d.text(
        (cx - (dir_ - esq) / 2 - esq, cy + lado * 0.14 - topo),
        texto,
        font=f,
        fill=TEXTO,
    )

    return img.resize((tamanho, tamanho), Image.LANCZOS)


def main() -> None:
    os.makedirs(SAIDA, exist_ok=True)

    # Ícone comum: pouca margem, cantos arredondados.
    for tamanho in (192, 512):
        desenhar(tamanho, 0.20, cantos=True).save(
            os.path.join(SAIDA, f"icone-{tamanho}.png")
        )

    # Mascarável: fundo até a borda e margem grande, porque o Android recorta.
    desenhar(512, 0.30, cantos=False).save(os.path.join(SAIDA, "icone-mascara.png"))

    # Apple não lê o manifest: precisa do seu próprio arquivo.
    desenhar(180, 0.20, cantos=True).save(os.path.join(SAIDA, "apple-touch-icon.png"))

    # Favicon multi-resolução.
    desenhar(64, 0.16, cantos=True).save(
        os.path.join(SAIDA, "..", "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )

    for nome in sorted(os.listdir(SAIDA)):
        caminho = os.path.join(SAIDA, nome)
        print(f"{nome:26} {os.path.getsize(caminho):>7} bytes")


if __name__ == "__main__":
    main()

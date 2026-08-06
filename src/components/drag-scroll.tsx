/**
 * Faixa que rola de lado, arrastando também com o mouse.
 *
 * No celular o toque já arrasta. No navegador, não: rolagem horizontal só
 * responde a barra ou à roda com Shift, e quem está com o mouse tenta
 * arrastar — não conseguindo, conclui que a faixa está travada.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, ScrollView, type StyleProp, type ViewStyle } from 'react-native';

export function DragScroll({
  children,
  style,
  contentContainerStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = ref.current?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node) return;

    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (event: MouseEvent) => {
      dragging = true;
      startX = event.pageX;
      startScroll = node.scrollLeft;
      node.style.cursor = 'grabbing';
    };

    const onMove = (event: MouseEvent) => {
      if (!dragging) return;

      node.scrollLeft = startScroll - (event.pageX - startX);
      // Sem isto o navegador tenta selecionar o conteúdo enquanto arrasta.
      event.preventDefault();
    };

    const onUp = () => {
      dragging = false;
      node.style.cursor = 'grab';
    };

    // A mãozinha é o que avisa que dá para arrastar.
    node.style.cursor = 'grab';
    node.addEventListener('mousedown', onDown);
    // No window, e não no nó: soltar o botão fora da faixa também encerra.
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      node.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );
}

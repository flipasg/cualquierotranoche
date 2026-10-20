import assert from 'node:assert/strict';
import test from 'node:test';
import { renderRichText } from '../src/lib/rich-text.mjs';

test('renderiza formato inline, negrita y saltos de línea', () => {
  assert.equal(
    renderRichText('Texto **fuerte**\nsegunda línea', true),
    'Texto <strong>fuerte</strong><br>segunda línea',
  );
});

test('renderiza color de acento y color hexadecimal personalizado', () => {
  assert.equal(
    renderRichText(
      '{{accent}}Ciruela{{/accent}} y {{color:#123456}}otro color{{/color}}',
      true,
    ),
    '<span class="text-accent">Ciruela</span> y <span style="color:#123456">otro color</span>',
  );
});

test('mantiene los párrafos y saltos de línea del formato de bloque', () => {
  assert.equal(
    renderRichText('Primera línea.\nSegunda línea.\n\n{{accent}}Cierre.{{/accent}}'),
    '<p>Primera línea.<br>Segunda línea.</p>\n<p><span class="text-accent">Cierre.</span></p>\n',
  );
});
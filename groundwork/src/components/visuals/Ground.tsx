/**
 * The shared ground strip drawn at the base of tree, strength, building,
 * and mountain (the mountain visual repeats these exact numbers inline
 * in the prototype rather than reusing its own `ground` var, so it gets
 * its own copy in Mountain.tsx rather than importing this).
 *
 * Ported from reference/groundwork.html:
 * `const ground = '<rect x="0" y="182" width="200" height="18" ' + st("--ground") + '/>';`
 */
export function Ground() {
  return <rect x={0} y={182} width={200} height={18} style={{ fill: "var(--ground)" }} />;
}

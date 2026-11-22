with open('public/js/monk-controller.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'updateTransform() {' in line:
        start_idx = i
        break

for i, line in enumerate(lines):
    if 'clearTimers() {' in line:
        end_idx = i
        break

new_lines = [
    '    updateTransform() {\n',
    '      if (!this.element) return;\n',
    '      this.element.style.left = Math.round(this.currentX) + "px";\n',
    '      this.element.style.top = this.currentY + "px";\n',
    '      this.element.style.transform = "translate(-50%, -100%) scale(" + this.currentScale + ")";\n',
    '      if (this.spriteImg) {\n',
    '        const flipX = this.direction > 0 ? -1 : 1;\n',
    '        this.spriteImg.style.transform = "scaleX(" + flipX + ")";\n',
    '      }\n',
    '    }\n',
    '\n'
]
lines[start_idx:end_idx] = new_lines

with open('public/js/monk-controller.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed cleanly!')

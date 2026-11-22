with open('public/js/worshipper-manager.js', 'r', encoding='utf-8') as f:
    c = f.read()

old_code = """      if (this.element) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.zIndex = zIndex;
        const flipX = flip ? -1 : 1;
        this.element.style.transform = `translate(-50%, -100%) scale(${scale}) scaleX(${flipX})`;
      }"""

new_code = """      if (this.element) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.zIndex = zIndex;
        this.element.style.transform = `translate(-50%, -100%) scale(${scale})`;
      }
      if (this.spriteImg) {
        const flipX = flip ? -1 : 1;
        this.spriteImg.style.transform = `scaleX(${flipX})`;
      }"""

assert old_code in c, 'old_code not found'
c = c.replace(old_code, new_code)

with open('public/js/worshipper-manager.js', 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully fixed flip transform in worshipper-manager.js')

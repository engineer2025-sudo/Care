import {test,expect} from '@playwright/test'

async function openLanguage(page){
 await page.getByRole('button',{name:'Settings and accessibility',exact:true}).click()
 return page.getByTestId('app-language')
}
test('all five languages persist, update document language and keep the care-note draft',async({page})=>{
 await page.goto('/')
 await page.getByRole('navigation').filter({visible:true}).getByRole('button',{name:'Care Circle',exact:true}).click()
 await page.getByRole('textbox',{name:'New care note'}).fill('Save {1} · 安 · Nguyễn · private draft')
 const picker=await openLanguage(page)
 for(const [id,tag,save] of [['es','es-US','Guardar'],['zh-Hans','zh-CN','保存'],['fil','fil-PH','I-save'],['vi','vi-VN','Lưu'],['en','en-US','Save']]){
  await picker.selectOption(id)
  await expect(page.locator('html')).toHaveAttribute('lang',tag)
  // A stable form field survives language changes; it is not translated or remounted.
  await expect(page.locator('textarea').first()).toHaveValue('Save {1} · 安 · Nguyễn · private draft')
  await expect(page.getByRole('button',{name:save,exact:true})).toBeAttached()
 }
 await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Save',exact:true}).click()
 await expect(page.locator('.care-note-item').filter({hasText:'Save {1} · 安 · Nguyễn · private draft'})).toBeVisible()
 const again=await openLanguage(page);await again.selectOption('es')
 await page.reload()
 await expect(page.locator('html')).toHaveAttribute('lang','es-US')
 await page.getByRole('navigation').filter({visible:true}).getByRole('button',{name:'Círculo de cuidado',exact:true}).click()
 await expect(page.locator('.care-note-item').filter({hasText:'Save {1} · 安 · Nguyễn · private draft'})).toBeVisible()
})
test('device language selects Spanish without setup and translated activity search keeps IDs',async({browser})=>{
 const context=await browser.newContext({locale:'es-MX',viewport:{width:390,height:844}})
 const page=await context.newPage();await page.goto('/')
 await expect(page.locator('html')).toHaveAttribute('lang','es-US')
 await page.getByRole('navigation').filter({visible:true}).getByRole('button',{name:'Actividades',exact:true}).click()
 await page.getByPlaceholder('Prueba una palabra, como calma o historia').fill('patrón')
 await expect(page.getByRole('heading',{name:'Completar el patrón',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await context.close()
})
test('personal notes and custom phrases identical to translation keys remain unchanged',async({page})=>{
 await page.goto('/')
 await page.getByRole('navigation').filter({visible:true}).getByRole('button',{name:'Care Circle',exact:true}).click()
 await page.getByRole('textbox',{name:'New care note'}).fill('Save')
 await page.getByRole('button',{name:'Save',exact:true}).click()
 const picker=await openLanguage(page);await picker.selectOption('es');await page.keyboard.press('Escape')
 await expect(page.locator('.care-note-item p').first()).toHaveText('Save')
 await page.getByRole('button',{name:'Mis herramientas de apoyo',exact:true}).click()
 await page.getByRole('combobox').selectOption('communicate')
 await page.getByRole('textbox',{name:'Mi propia frase'}).fill('Yes')
 await page.getByRole('button',{name:'Añadir una frase',exact:true}).click()
 await expect(page.getByRole('button',{name:'Sí',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Yes',exact:true}).click()
 await expect(page.locator('.support-display p')).toHaveText('Yes')
})

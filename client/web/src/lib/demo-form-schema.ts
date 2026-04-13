import { z } from 'zod'

export const demoFormSchema = z.object({
  companyName: z.string().min(2, 'Firma adını girin.'),
  contactName: z.string().min(2, 'Yetkili adını girin.'),
  email: z.string().email('Geçerli bir e-posta girin.'),
  phone: z.string().min(10, 'Telefon numarası çok kısa.').max(20, 'Telefon numarası çok uzun.'),
  portfolioSize: z.string().min(1, 'Portföy büyüklüğünü seçin.'),
  message: z
    .string()
    .min(12, 'Kısa bir ihtiyaç notu ekleyin.')
    .max(600, 'Mesajı biraz kısaltın.'),
})

export type DemoFormValues = z.infer<typeof demoFormSchema>

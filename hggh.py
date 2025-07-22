gb_usados = float(input("GB usados este mes: "))

if gb_usados < 5:
    plan = "Básico"
elif gb_usados < 15:
    plan = "Intermedio"
else:
    plan = "Premium"

print(f"Te recomendamos el plan: {plan}")
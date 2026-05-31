import re

with open('frontend/src/pages/ManagerDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1
content = content.replace(
'''                  <div className="px-5 py-3 bg-gray-50 border-t bordertVersion?.textContent || \\'Sem descrição.\\'}
                    </p>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">''',
'''                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">'''
)

# Fix 2
content = content.replace(
'''                    <div className="flex flex-wrap gap-2">
                      {challenge.axes && challenge.axes.map((axis, i).name} ({axis.type})
                        </span>
                      ))}
                    </div>''',
'''                    <div className="flex flex-wrap gap-2">
                      {challenge.axes && challenge.axes.map((axis, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-600 shadow-sm">
                          {axis.name} ({axis.type})
                        </span>
                      ))}
                    </div>'''
)

# Fix 3
content = content.replace(
'''                      <p className="text-gray-500 text-sm text-           <p className="text-indigo-600 font-medium">A IA está pensando...</p>
                      <p className="text-gray-500 text-sm text-center max-w-sm mt-2">Analisando o título, des       <>''',
'''                      <p className="text-gray-500 text-sm text-center max-w-sm mt-2">Analisando o título, descrição e as personas para sugerir os melhores eixos de avaliação.</p>'''
)

# Fix 4
content = content.replace(
'''                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={() => setChallengeStep(1)} cla               <div className="pt-4 flex justify-between">''',
'''                      <div className="pt-4 flex justify-between">'''
)

# Fix 5
content = content.replace(
'''                  </div>

    text-sm font-medium text-gray-700">Eixos de Avaliação</label>
                      <button type="button" onClick={handleAddAxis} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center font-medium">''',
'''                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Eixos de Avaliação</label>
                      <button type="button" onClick={handleAddAxis} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center font-medium">'''
)

# Fix 6 duplicate ends
end_block = '''            </div>
          </div>
        </div>
      )}
    </div>
  );
}'''

# Clean all garbage after the final component ending.
# We will split by the first clean end_block, then drop the rest.
idx = content.find(end_block)
if idx != -1:
    content = content[:idx + len(end_block)] + '\\n'

with open('frontend/src/pages/ManagerDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed dashboard')

from setuptools import setup, Extension
from Cython.Build import cythonize

# Configurar extensión Cython
extensions = [
    Extension(
        "scheduler",
        ["scheduler.pyx"],
        language="c",
    )
]

setup(
    name="scheduler",
    ext_modules=cythonize(
        extensions,
        compiler_directives={'language_level': "3"}
    ),
)
